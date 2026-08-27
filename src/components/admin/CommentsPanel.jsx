import { useCallback, useEffect, useState } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { listCommentsForModeration, moderateComment } from '../../services/commentModeration';

const FILTERS = [
  { value: 'pending', label: 'Pendentes' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' },
];

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export default function CommentsPanel() {
  const [filter, setFilter] = useState('pending');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');

  const loadComments = useCallback(async (nextFilter) => {
    setLoading(true);
    setMessage('');
    try {
      setComments(await listCommentsForModeration(nextFilter));
    } catch {
      setComments([]);
      setMessage('Não foi possível carregar os comentários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadComments(filter); }, [filter, loadComments]);

  async function handleModeration(id, status) {
    setProcessingId(id);
    setMessage('');
    try {
      await moderateComment(id, status);
      setComments((current) => current.filter((comment) => comment.id !== id));
      setMessage(status === 'approved' ? 'Comentário aprovado.' : 'Comentário rejeitado.');
    } catch {
      setMessage('Não foi possível atualizar o comentário.');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <>
      <nav className="admin-filters" aria-label="Filtrar avaliações">
        {FILTERS.map((item) => (
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
      {loading && <p className="admin-empty">Carregando avaliações…</p>}
      {!loading && comments.length === 0 && (
        <p className="admin-empty">Nenhuma avaliação nesta fila.</p>
      )}

      <div className="admin-comments">
        {comments.map((comment) => (
          <article className="admin-comment glass-card" key={comment.id}>
            <header>
              <div>
                <strong>{comment.name}</strong>
                <time dateTime={comment.created_at}>
                  {dateFormatter.format(new Date(comment.created_at))}
                </time>
              </div>
              <span aria-label={`${comment.rating} de 5`}>
                {'○'.repeat(comment.rating)}{'·'.repeat(5 - comment.rating)}
              </span>
            </header>
            <p>{comment.message}</p>
            {filter === 'pending' && (
              <footer>
                <button
                  className="reject"
                  type="button"
                  disabled={processingId === comment.id}
                  onClick={() => handleModeration(comment.id, 'rejected')}
                >
                  <FaTimes aria-hidden="true" /> Rejeitar
                </button>
                <button
                  className="approve"
                  type="button"
                  disabled={processingId === comment.id}
                  onClick={() => handleModeration(comment.id, 'approved')}
                >
                  <FaCheck aria-hidden="true" /> Aprovar
                </button>
              </footer>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
