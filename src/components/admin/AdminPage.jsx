import { useCallback, useEffect, useRef, useState } from 'react';
import { FaBell, FaLock, FaSignOutAlt } from 'react-icons/fa';
import {
  getAdminSession,
  isCommentAdmin,
  signInAdmin,
  signOutAdmin,
} from '../../services/commentModeration';
import { subjectLabel } from '../../services/contact';
import { countNewContactRequests, subscribeToContactRequests } from '../../services/contactInbox';
import { supabaseConfigured } from '../../services/supabase';
import CommentsPanel from './CommentsPanel';
import InboxPanel from './InboxPanel';
import PricingPanel from './PricingPanel';
import ProjectsPanel from './ProjectsPanel';

const ABAS = [
  { value: 'projetos', label: 'Projetos' },
  { value: 'valores', label: 'Valores' },
  { value: 'avaliacoes', label: 'Avaliações' },
  { value: 'mensagens', label: 'Mensagens' },
];

const TITULO_BASE = 'Moderação · Portfólio';
const INTERVALO_CONSULTA_MS = 60000;
const ALERTA_MS = 9000;

function AdminPage({ onReady }) {
  const [session, setSession] = useState(null);
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [aba, setAba] = useState('projetos');
  const [novas, setNovas] = useState(0);
  const [sinalNovaMensagem, setSinalNovaMensagem] = useState(0);
  const [alerta, setAlerta] = useState(null);
  const tituloOriginal = useRef(null);

  const verifySession = useCallback(async (nextSession) => {
    setSession(nextSession);
    if (!nextSession?.user) {
      setAuthorized(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setAuthorized(await isCommentAdmin(nextSession.user.id));
    } catch {
      setAuthorized(false);
      setMessage('Não foi possível validar sua autorização.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!supabaseConfigured) {
      setLoading(false);
      onReady?.();
      return undefined;
    }

    getAdminSession()
      .then((currentSession) => active && verifySession(currentSession))
      .catch(() => active && setMessage('Não foi possível iniciar a autenticação.'))
      .finally(() => active && onReady?.());

    return () => { active = false; };
  }, [onReady, verifySession]);

  /* Contador de demandas novas. O Realtime dá o aviso imediato; se o canal não
     assinar (a tabela pode não estar publicada em supabase_realtime), o painel
     cai para uma consulta periódica em vez de ficar mudo até um F5. */
  useEffect(() => {
    if (!authorized) return undefined;

    let active = true;
    let intervalo = null;

    const atualizarContagem = () => countNewContactRequests()
      .then((total) => { if (active) setNovas(total); })
      .catch(() => { /* o painel continua utilizável sem o contador */ });

    atualizarContagem();

    const cancelar = subscribeToContactRequests({
      onInsert: (linha) => {
        if (!active) return;
        setNovas((total) => total + 1);
        setSinalNovaMensagem((valor) => valor + 1);
        setAlerta(linha);
      },
      onStatus: (status) => {
        if (!active || status === 'SUBSCRIBED' || intervalo !== null) return;
        intervalo = window.setInterval(atualizarContagem, INTERVALO_CONSULTA_MS);
      },
    });

    return () => {
      active = false;
      if (intervalo !== null) window.clearInterval(intervalo);
      cancelar();
    };
  }, [authorized]);

  /* Com o painel aberto numa aba de fundo, o título é o único lugar onde uma
     demanda nova aparece sem o usuário voltar para cá. */
  useEffect(() => {
    if (!authorized) return undefined;
    tituloOriginal.current ??= document.title;
    document.title = novas > 0 ? `(${novas}) ${TITULO_BASE}` : TITULO_BASE;
    return () => {
      if (tituloOriginal.current) document.title = tituloOriginal.current;
    };
  }, [authorized, novas]);

  useEffect(() => {
    if (!alerta) return undefined;
    const limite = window.setTimeout(() => setAlerta(null), ALERTA_MS);
    return () => window.clearTimeout(limite);
  }, [alerta]);

  async function handleLogin(event) {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setMessage('');
    try {
      await verifySession(await signInAdmin(
        String(form.get('email')),
        String(form.get('password')),
      ));
    } catch {
      setMessage('Credenciais inválidas ou acesso indisponível.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setMessage('');
    try {
      await signOutAdmin();
    } finally {
      setSession(null);
      setAuthorized(null);
      setNovas(0);
      setAlerta(null);
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-backdrop" aria-hidden="true" />

      {!session && (
        <section className="admin-login glass-card" aria-labelledby="admin-title">
          <FaLock className="admin-lock" aria-hidden="true" />
          <p className="admin-kicker">ÁREA RESTRITA</p>
          <h1 id="admin-title">Moderação</h1>
          <p>Entre com o usuário autorizado no Supabase.</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="admin-email">E-mail</label>
            <input id="admin-email" name="email" type="email" autoComplete="username" required />
            <label htmlFor="admin-password">Senha</label>
            <input id="admin-password" name="password" type="password" autoComplete="current-password" required />
            <button type="submit" disabled={!supabaseConfigured || submitting}>
              {submitting ? 'Autenticando…' : 'Entrar'}
            </button>
          </form>
          {message && <p className="admin-status" role="status">{message}</p>}
        </section>
      )}

      {session && authorized === false && (
        <section className="admin-login glass-card" aria-labelledby="access-title">
          <FaLock className="admin-lock" aria-hidden="true" />
          <h1 id="access-title">Acesso não autorizado</h1>
          <p>Este usuário não está cadastrado como moderador.</p>
          {message && <p className="admin-status" role="status">{message}</p>}
          <button type="button" onClick={handleLogout}>Sair</button>
        </section>
      )}

      {session && authorized === null && loading && (
        <p className="admin-empty">Validando acesso…</p>
      )}

      {session && authorized && (
        <section className="admin-dashboard" aria-labelledby="moderation-title">
          <header className="admin-header">
            <div>
              <p className="admin-kicker">PAINEL DO CRIADOR</p>
              <h1 id="moderation-title">Moderação</h1>
              <p>{session.user.email}</p>
            </div>
            <button className="admin-logout" type="button" onClick={handleLogout}>
              <FaSignOutAlt aria-hidden="true" />
              <span>Sair</span>
            </button>
          </header>

          <nav className="admin-abas" aria-label="Seções do painel">
            {ABAS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={aba === item.value ? 'active' : ''}
                aria-current={aba === item.value ? 'page' : undefined}
                onClick={() => setAba(item.value)}
              >
                {item.label}
                {item.value === 'mensagens' && novas > 0 && (
                  <span className="admin-selo" aria-label={`${novas} não lidas`}>{novas}</span>
                )}
              </button>
            ))}
          </nav>

          {aba === 'projetos' && <ProjectsPanel />}
          {aba === 'valores' && <PricingPanel />}
          {aba === 'avaliacoes' && <CommentsPanel />}
          {aba === 'mensagens' && (
            <InboxPanel
              sinalNovaMensagem={sinalNovaMensagem}
              onNovasVariou={(delta) => setNovas((total) => Math.max(0, total + delta))}
            />
          )}
        </section>
      )}

      {alerta && (
        <div className="admin-alerta glass-card" role="alert">
          <FaBell className="admin-alerta-icone" aria-hidden="true" />
          <div className="admin-alerta-texto">
            <strong>Nova demanda</strong>
            <span>{alerta.name} · {subjectLabel(alerta.subject)}</span>
          </div>
          <button
            type="button"
            onClick={() => { setAba('mensagens'); setAlerta(null); }}
          >
            Ver
          </button>
          <button
            className="admin-alerta-fechar"
            type="button"
            onClick={() => setAlerta(null)}
            aria-label="Dispensar aviso"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        </div>
      )}
    </main>
  );
}

export default AdminPage;
