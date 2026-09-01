import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { createComment, commentsConfigured, listComments } from '../../services/comments';
import { remainingCooldown, writeLastSentAt } from '../../services/cooldown';
import BubbleButton from '../ui/BubbleButton';
import { useI18n } from '../../i18n/context';

const COMMENT_COOLDOWN_MS = 30000;
const COMMENT_TIMESTAMP_KEY = 'portfolio:last-comment-at';

/* Mesmo material das bolhas de clique (`.cursor-bolha-clique`, ver
   global.css) — a nota vira uma fileira de cinco delas, acesas até `rating`.
   Trocou uma composição SVG própria (membrana, refração, reflexo, brilho, um
   `<filter>` de glow) por esse mesmo par border+gradiente+box-shadow que já
   se repete pelo cursor e pelo Hero: uma única aparência de "bolha" no site,
   e não uma terceira variação só para a nota dos comentários. */
function RatingBubbles({ rating }) {
  const { t } = useI18n();
  return (
    <div className="avaliacao-bolhas" role="img" aria-label={t('comments.rating', { rating })}>
      {[1, 2, 3, 4, 5].map((bubble) => (
        <i key={bubble} className={bubble <= rating ? 'ativa' : ''} aria-hidden="true" />
      ))}
    </div>
  );
}

function Comments() {
  const { localeTag, t } = useI18n();
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(localeTag, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }), [localeTag]);
  const dragRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(commentsConfigured);
  const [sending, setSending] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  useEffect(() => {
    if (!commentsConfigured) return undefined;
    const controller = new AbortController();
    listComments({ signal: controller.signal })
      .then(setComments)
      .catch((error) => {
        if (error.name !== 'AbortError') setComments([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setModalOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!commentsConfigured || sending) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get('website')) return;
    const name = String(data.get('name') || '').trim();
    const message = String(data.get('message') || '').trim();
    const rating = Number(data.get('rating'));
    if (name.length < 2 || message.length < 2 || rating < 1 || rating > 5) return;

    const now = Date.now();
    const remaining = remainingCooldown(COMMENT_TIMESTAMP_KEY, COMMENT_COOLDOWN_MS, now);
    if (remaining > 0) {
      setSubmitStatus(t('comments.wait', { seconds: remaining }));
      return;
    }

    setSending(true);
    setSubmitStatus('');
    try {
      await createComment({ name, message, rating });
      writeLastSentAt(COMMENT_TIMESTAMP_KEY, now);
      form.reset();
      setSubmitStatus(t('comments.sent'));
    } catch {
      setSubmitStatus(t('comments.failed'));
    } finally {
      setSending(false);
    }
  }

  function moveCarousel(direction) {
    if (!carouselItems.length) return;
    setActiveIndex((current) => (current + direction + carouselItems.length) % carouselItems.length);
  }

  const carouselItems = comments.length > 0
    ? comments
    : (!loading ? t('comments.placeholders').map((comment) => ({ ...comment, placeholder: true })) : []);

  function getCircularOffset(index) {
    let offset = index - activeIndex;
    const middle = carouselItems.length / 2;
    if (offset > middle) offset -= carouselItems.length;
    if (offset < -middle) offset += carouselItems.length;
    return offset;
  }

  function handleCarouselPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.pointerType === 'mouse') event.preventDefault();
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    setDragOffset(0);
  }

  function handleCarouselPointerMove(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    const distance = event.clientX - dragRef.current.startX;
    setDragOffset(Math.max(-180, Math.min(180, distance)));
  }

  function finishCarouselDrag(event, cancelled = false) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    const distance = event.clientX - dragRef.current.startX;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragging(false);
    setDragOffset(0);
    if (!cancelled && Math.abs(distance) >= Math.min(70, event.currentTarget.clientWidth * 0.12)) {
      moveCarousel(distance < 0 ? 1 : -1);
    }
  }

  return (
    <section id="comentarios" className="comentarios-section">
      <div className="comentarios-feed" aria-busy={loading}>
        <BubbleButton
          className="comentarios-adicionar"
          icon="plus"
          label={t('comments.add')}
          onClick={() => {
            setSubmitStatus('');
            setModalOpen(true);
          }}
          disabled={!commentsConfigured}
        />
        {loading && <p className="comentarios-vazio">{t('comments.loading')}</p>}
        <ol
          className={dragging ? 'arrastando' : ''}
          style={{ '--arrasto': `${dragOffset}px` }}
          aria-live="polite"
          aria-label={t('comments.carousel')}
          tabIndex="0"
          onPointerDown={handleCarouselPointerDown}
          onPointerMove={handleCarouselPointerMove}
          onPointerUp={finishCarouselDrag}
          onPointerCancel={(event) => finishCarouselDrag(event, true)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              moveCarousel(event.key === 'ArrowRight' ? 1 : -1);
            }
          }}
        >
          {carouselItems.map((comment, index) => {
            const offset = getCircularOffset(index);
            const distance = Math.abs(offset);
            return (
            <li
              key={comment.id ?? comment.name}
              className={`${comment.placeholder ? 'comentario-placeholder ' : ''}${offset === 0 ? 'comentario-ativo' : ''}${distance > 2 ? ' comentario-distante' : ''}`}
              style={{
                '--deslocamento': offset,
                '--distancia': distance,
                zIndex: Math.max(1, 10 - distance),
              }}
              aria-hidden={distance > 2}
            >
              <header>
                <strong>{comment.name}</strong>
                {comment.placeholder ? (
                  <RatingBubbles rating={comment.rating} />
                ) : (
                  <time dateTime={comment.created_at}>
                    {dateFormatter.format(new Date(comment.created_at))}
                  </time>
                )}
              </header>
              {!comment.placeholder && <RatingBubbles rating={comment.rating ?? 5} />}
              <p>{comment.message}</p>
            </li>
            );
          })}
        </ol>
        <div className="comentarios-carrossel-controles" aria-label={t('comments.controls')}>
          <button type="button" onClick={() => moveCarousel(-1)} aria-label={t('comments.previous')}>
            <FaArrowLeft aria-hidden="true" />
          </button>
          <button type="button" onClick={() => moveCarousel(1)} aria-label={t('comments.next')}>
            <FaArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="comentarios-modal-fundo" role="presentation" onPointerDown={() => setModalOpen(false)}>
          <div
            className="comentarios-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="comentarios-modal-titulo"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              className="comentarios-modal-fechar"
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label={t('comments.close')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m7 7 10 10M17 7 7 17" />
              </svg>
            </button>
            <h2 id="comentarios-modal-titulo">{t('comments.title')}</h2>
            <form className="comentarios-form" onSubmit={handleSubmit}>
          <label htmlFor="comment-name">{t('comments.name')}</label>
          <input
            id="comment-name"
            name="name"
            type="text"
            placeholder={t('comments.name')}
            minLength="2"
            maxLength="40"
            autoComplete="name"
            required
            disabled={!commentsConfigured || sending}
          />
          <label htmlFor="comment-message">{t('comments.comment')}</label>
          <textarea
            id="comment-message"
            name="message"
            placeholder={t('comments.comment')}
            minLength="2"
            maxLength="500"
            rows="5"
            required
            disabled={!commentsConfigured || sending}
          />
          <fieldset className="comentarios-nota" disabled={!commentsConfigured || sending}>
            <legend>{t('comments.evaluation')}</legend>
            <div className="comentarios-nota-opcoes">
              {[5, 4, 3, 2, 1].map((rating) => (
                <label key={rating} title={t('comments.stars', { rating })}>
                  <input type="radio" name="rating" value={rating} defaultChecked={rating === 5} />
                  <i className="comentarios-nota-icone" aria-hidden="true" />
                  <span className="sr-only">{t('comments.stars', { rating })}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <input
            className="comentarios-armadilha"
            name="website"
            type="text"
            tabIndex="-1"
            autoComplete="off"
            aria-hidden="true"
          />
          <div className="comentarios-form-rodape">
            <span>{t('comments.max')}</span>
            <BubbleButton
              className="comentarios-enviar"
              type="submit"
              icon="send"
              label={t('comments.send')}
              loading={sending}
              loadingLabel={t('comments.sending')}
              disabled={!commentsConfigured || sending}
            />
          </div>
              <p className="comentarios-status" aria-live="polite">{submitStatus}</p>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(Comments);
