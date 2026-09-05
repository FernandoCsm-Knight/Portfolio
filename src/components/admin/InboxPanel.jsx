import { useEffect, useState } from 'react';
import { FaArchive, FaEnvelopeOpenText, FaKey, FaLock, FaReply, FaUndo } from 'react-icons/fa';
import { subjectLabel } from '../../services/contact';
import {
  cofreDestravado,
  cofreGuardado,
  destravar,
  esquecerCofre,
  guardarCofre,
  trancar,
} from '../../services/contactCrypto';
import {
  INBOX_FILTERS,
  listContactRequests,
  setContactRequestStatus,
} from '../../services/contactInbox';
import { useAdminList } from '../../hooks/useAdminList';
import { formatAdminDate } from '../../utils/adminDate';
import { EXTERNAL_LINK_PROPS } from '../../utils/links';

function respostaHref({ name, email, subject }) {
  const assunto = `Re: ${subjectLabel(subject)} — portfólio`;
  const corpo = `Olá, ${name.split(' ')[0]}!\n\n`;
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

/**
 * @param {object} props
 * @param {number} props.sinalNovaMensagem contador que muda a cada INSERT
 *   recebido pelo Realtime; serve só para recarregar a fila de novas.
 * @param {(delta: number) => void} props.onNovasVariou ajusta o contador do
 *   cabeçalho quando uma demanda sai (ou volta para) a fila de novas.
 */
export default function InboxPanel({ sinalNovaMensagem, onNovasVariou }) {
  const [filter, setFilter] = useState('new');
  const [processingId, setProcessingId] = useState(null);

  /* Estado do cofre, não do componente: a chave vive em contactCrypto e
     sobrevive à troca de aba. Este `useState` só espelha aquilo para o React
     saber quando redesenhar. */
  const [destravado, setDestravado] = useState(cofreDestravado);
  const [temCofre, setTemCofre] = useState(cofreGuardado);
  const [abrindo, setAbrindo] = useState(false);
  const [erroCofre, setErroCofre] = useState('');

  const {
    items: requests, setItems: setRequests, loading, message, setMessage, reload,
  } = useAdminList(listContactRequests, filter, 'Não foi possível carregar as mensagens.');

  /* Uma demanda que chega enquanto a aba já está aberta precisa aparecer na
     lista, não só no contador do cabeçalho. */
  useEffect(() => {
    if (sinalNovaMensagem > 0 && filter === 'new') reload();
  }, [sinalNovaMensagem, filter, reload]);

  async function mover(request, status) {
    setProcessingId(request.id);
    setMessage('');
    try {
      await setContactRequestStatus(request.id, status);
      setRequests((current) => current.filter((item) => item.id !== request.id));
      if (request.status === 'new' && status !== 'new') onNovasVariou(-1);
      if (request.status !== 'new' && status === 'new') onNovasVariou(1);
    } catch {
      setMessage('Não foi possível atualizar a mensagem.');
    } finally {
      setProcessingId(null);
    }
  }

  async function abrirCofre(event) {
    event.preventDefault();
    if (abrindo) return;

    const form = new FormData(event.currentTarget);
    setAbrindo(true);
    setErroCofre('');

    try {
      /* Colar o arquivo e digitar a senha acontecem juntos na primeira vez: só
         a senha prova que o arquivo colado é o par certo, então guardar um sem
         validar o outro deixaria um cofre quebrado no localStorage. */
      const colado = String(form.get('cofre') ?? '').trim();
      if (colado) guardarCofre(colado);

      await destravar(String(form.get('senha')));
      setTemCofre(true);
      setDestravado(true);
      reload();
    } catch (erro) {
      /* Um arquivo mal colado precisa de mensagem diferente de uma senha
         errada: no primeiro caso mexer na senha não adianta nada. */
      setErroCofre(erro instanceof SyntaxError || erro?.message === 'COFRE_INVALIDO'
        ? 'Isso não parece o conteúdo de chave-contato.json.'
        : 'Senha incorreta — ou o arquivo guardado não é o par desta caixa.');
    } finally {
      setAbrindo(false);
    }
  }

  function fecharCofre() {
    trancar();
    setDestravado(false);
    reload();
  }

  function descartarCofre() {
    /* Só o cofre local some: as mensagens continuam cifradas no banco, e o
       arquivo chave-contato.json continua abrindo tudo. Por isso um confirm
       basta aqui — nada se perde de forma irreversível. */
    if (!window.confirm('Remover a chave deste navegador? Você precisará colar chave-contato.json de novo.')) return;
    esquecerCofre();
    setTemCofre(false);
    setDestravado(false);
    setErroCofre('');
    reload();
  }

  return (
    <>
      <nav className="admin-filters" aria-label="Filtrar mensagens">
        {INBOX_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={filter === item.value ? 'active' : ''}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
        {destravado && (
          <button className="admin-cofre-trancar" type="button" onClick={fecharCofre}>
            <FaLock aria-hidden="true" /> Trancar
          </button>
        )}
      </nav>

      {!destravado && (
        <section className="admin-cofre glass-card" aria-labelledby="cofre-title">
          <FaKey className="admin-lock" aria-hidden="true" />
          <h2 id="cofre-title">Caixa de entrada cifrada</h2>
          <p>
            As demandas são seladas em <code>/api/contact</code> com a chave pública e só
            abrem aqui. A chave privada não passa pelo servidor: destrave-a neste navegador
            para ler as mensagens.
          </p>

          <form onSubmit={abrirCofre}>
            {!temCofre && (
              <>
                <label htmlFor="cofre-arquivo">Conteúdo de chave-contato.json</label>
                <textarea
                  id="cofre-arquivo"
                  name="cofre"
                  rows={5}
                  required
                  spellCheck="false"
                  placeholder={'{ "v": 1, "kdf": "PBKDF2-SHA256", … }'}
                />
              </>
            )}

            <label htmlFor="cofre-senha">Senha da chave</label>
            <input
              id="cofre-senha"
              name="senha"
              type="password"
              autoComplete="off"
              required
            />

            <button type="submit" disabled={abrindo}>
              {abrindo ? 'Destravando…' : 'Destravar'}
            </button>
          </form>

          {erroCofre && <p className="admin-status" role="alert">{erroCofre}</p>}

          {temCofre && (
            <button className="admin-cofre-descartar" type="button" onClick={descartarCofre}>
              Remover a chave deste navegador
            </button>
          )}
        </section>
      )}

      {message && <p className="admin-status" role="status">{message}</p>}
      {loading && <p className="admin-empty">Carregando mensagens…</p>}
      {!loading && requests.length === 0 && (
        <p className="admin-empty">Nenhuma mensagem nesta fila.</p>
      )}

      <div className="admin-inbox">
        {requests.map((request) => (
          <article className="admin-mensagem glass-card" key={request.id}>
            <header>
              <div>
                {/* Trancado, a linha ainda existe e ainda pode ser triada: dá
                    para arquivar spam pelo assunto e pela data sem decifrar. */}
                <strong>{request.decifrada ? request.name : 'Mensagem cifrada'}</strong>
                {request.decifrada
                  ? <a href={`mailto:${request.email}`}>{request.email}</a>
                  : <span className="admin-mensagem-empresa">
                      {destravado ? 'Não foi possível abrir esta demanda.' : 'Destrave a chave para ler.'}
                    </span>}
                {request.decifrada && request.company && (
                  <span className="admin-mensagem-empresa">{request.company}</span>
                )}
              </div>
              <div className="admin-mensagem-meta">
                <span className="admin-etiqueta">{subjectLabel(request.subject)}</span>
                <time dateTime={request.created_at}>
                  {formatAdminDate(new Date(request.created_at))}
                </time>
              </div>
            </header>

            {request.decifrada
              ? <p>{request.message}</p>
              : <p className="admin-mensagem-cifrada" aria-hidden="true">
                  {'▮'.repeat(180)}
                </p>}

            <footer>
              {request.decifrada && (
                <a
                  className="admin-responder"
                  href={respostaHref(request)}
                  {...EXTERNAL_LINK_PROPS}
                >
                  <FaReply aria-hidden="true" /> Responder
                </a>
              )}
              {request.status === 'new' && (
                <button
                  type="button"
                  disabled={processingId === request.id}
                  onClick={() => mover(request, 'read')}
                >
                  <FaEnvelopeOpenText aria-hidden="true" /> Marcar como lida
                </button>
              )}
              {request.status !== 'new' && (
                <button
                  type="button"
                  disabled={processingId === request.id}
                  onClick={() => mover(request, 'new')}
                >
                  <FaUndo aria-hidden="true" /> Reabrir
                </button>
              )}
              {request.status !== 'archived' && (
                <button
                  className="archive"
                  type="button"
                  disabled={processingId === request.id}
                  onClick={() => mover(request, 'archived')}
                >
                  <FaArchive aria-hidden="true" /> Arquivar
                </button>
              )}
            </footer>
          </article>
        ))}
      </div>
    </>
  );
}
