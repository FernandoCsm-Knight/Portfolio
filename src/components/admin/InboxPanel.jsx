import { useCallback, useEffect, useState } from 'react';
import { FaArchive, FaEnvelopeOpenText, FaReply, FaUndo } from 'react-icons/fa';
import { subjectLabel } from '../../services/contact';
import {
  INBOX_FILTERS,
  listContactRequests,
  setContactRequestStatus,
} from '../../services/contactInbox';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

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
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async (nextFilter) => {
    setLoading(true);
    setMessage('');
    try {
      setRequests(await listContactRequests(nextFilter));
    } catch {
      setRequests([]);
      setMessage('Não foi possível carregar as mensagens.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  /* Uma demanda que chega enquanto a aba já está aberta precisa aparecer na
     lista, não só no contador do cabeçalho. */
  useEffect(() => {
    if (sinalNovaMensagem > 0 && filter === 'new') load('new');
  }, [sinalNovaMensagem, filter, load]);

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
      </nav>

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
                <strong>{request.name}</strong>
                <a href={`mailto:${request.email}`}>{request.email}</a>
                {request.company && <span className="admin-mensagem-empresa">{request.company}</span>}
              </div>
              <div className="admin-mensagem-meta">
                <span className="admin-etiqueta">{subjectLabel(request.subject)}</span>
                <time dateTime={request.created_at}>
                  {dateFormatter.format(new Date(request.created_at))}
                </time>
              </div>
            </header>

            <p>{request.message}</p>

            <footer>
              <a
                className="admin-responder"
                href={respostaHref(request)}
                target="_blank"
                rel="noreferrer"
              >
                <FaReply aria-hidden="true" /> Responder
              </a>
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
