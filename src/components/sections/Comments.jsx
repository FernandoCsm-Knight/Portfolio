import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { createComment, commentsConfigured, listComments } from '../../services/comments';
import { remainingCooldown, writeLastSentAt } from '../../services/cooldown';
import BubbleButton from '../ui/BubbleButton';
import { useI18n } from '../../i18n/context';
import { createCarouselMotion } from '../../services/carouselMotion';

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
  const carouselRef = useRef(null);
  const motionRef = useRef(null);
  const frameRef = useRef(0);
  const lastFrameRef = useRef(0);
  const [comments, setComments] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
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

  const carouselItems = comments.length > 0
    ? comments
    : (!loading ? t('comments.placeholders').map((comment) => ({ ...comment, placeholder: true })) : []);

  function paintCarousel(time = performance.now() / 1000, dt = 0) {
    const track = carouselRef.current;
    const motion = motionRef.current;
    if (!track || !motion) return;
    const count = track.children.length;
    const angleOffset = motion.update(time, dt);
    const radius = Math.min(390, track.clientWidth * (window.innerWidth <= 900 ? 0.56 : 0.4));
    const front = count ? ((Math.round(-angleOffset * count / (Math.PI * 2)) % count) + count) % count : 0;
    Array.from(track.children).forEach((card, index) => {
      const angle = angleOffset + index * Math.PI * 2 / count;
      const depth = (Math.cos(angle) + 1) / 2;
      const x = Math.sin(angle) * radius;
      card.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${-(1 - depth) * 210}px) rotateY(${-Math.sin(angle) * 17}deg) scale(${0.75 + depth * 0.25})`;
      card.style.opacity = String(0.28 + depth * 0.72);
      card.style.zIndex = String(Math.round(depth * 100));
      card.style.visibility = depth < 0.12 ? 'hidden' : 'visible';
      card.setAttribute('aria-hidden', depth < 0.3 ? 'true' : 'false');
      card.classList.toggle('comentario-ativo', index === front);
    });
    if (!motion.moving) setActiveIndex((current) => current === front ? current : front);
  }

  function tick(frameTime) {
    frameRef.current = 0;
    const time = frameTime / 1000;
    paintCarousel(time, Math.min(0.05, Math.max(0, time - lastFrameRef.current)));
    lastFrameRef.current = time;
    if (motionRef.current?.moving) frameRef.current = requestAnimationFrame(tick);
  }

  function scheduleFrame() {
    if (!frameRef.current) {
      lastFrameRef.current = performance.now() / 1000;
      frameRef.current = requestAnimationFrame(tick);
    }
  }

  useLayoutEffect(() => {
    const track = carouselRef.current;
    motionRef.current = createCarouselMotion(
      carouselItems.length,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    paintCarousel();
    const resizeObserver = new ResizeObserver(() => paintCarousel());
    if (track) resizeObserver.observe(track);
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      motionRef.current = null;
    };
  }, [carouselItems.length]);

  function moveCarousel(direction) {
    if (motionRef.current?.navigate(direction)) scheduleFrame();
  }

  function handleCarouselPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.pointerType === 'mouse') event.preventDefault();
    if (!motionRef.current?.beginDrag()) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
  }

  function handleCarouselPointerMove(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    const distance = event.clientX - dragRef.current.startX;
    motionRef.current?.dragBy(distance, event.currentTarget.clientWidth);
    paintCarousel();
  }

  function finishCarouselDrag(event, cancelled = false) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    const distance = event.clientX - dragRef.current.startX;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragging(false);
    motionRef.current?.endDrag(distance, performance.now() / 1000, cancelled);
    scheduleFrame();
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
          ref={carouselRef}
          className={dragging ? 'arrastando' : ''}
          aria-live="polite"
          aria-label={t('comments.carousel')}
          tabIndex="0"
          onPointerDown={handleCarouselPointerDown}
          onPointerMove={handleCarouselPointerMove}
          onPointerUp={finishCarouselDrag}
          onPointerCancel={(event) => finishCarouselDrag(event, true)}
          onWheel={(event) => {
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && motionRef.current?.spinWheel(event.deltaX)) {
              scheduleFrame();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              moveCarousel(event.key === 'ArrowRight' ? 1 : -1);
            }
          }}
        >
          {carouselItems.map((comment, index) => {
            return (
            <li
              key={comment.id ?? comment.name}
              className={`${comment.placeholder ? 'comentario-placeholder ' : ''}${index === activeIndex ? 'comentario-ativo' : ''}`}
              aria-hidden={index !== activeIndex}
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
