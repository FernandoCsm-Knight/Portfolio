import { useEffect, useState } from 'react';
import {
  CONTACT_LIMITS,
  CONTACT_SUBJECTS,
  contactConfigured,
  createContactRequest,
} from '../../services/contact';
import { remainingCooldown, writeLastSentAt } from '../../services/cooldown';
import BubbleButton from '../ui/BubbleButton';
import { useI18n } from '../../i18n/context';

const COOLDOWN_MS = 60000;
const COOLDOWN_KEY = 'portfolio:last-contact-at';

export default function ContactForm({ onClose }) {
  const { t } = useI18n();
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    const anteriorOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = anteriorOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!contactConfigured || sending) return;

    const form = event.currentTarget;
    const dados = new FormData(form);
    if (dados.get('website')) return;

    const name = String(dados.get('name') || '').trim();
    const email = String(dados.get('email') || '').trim();
    const company = String(dados.get('company') || '').trim();
    const subject = String(dados.get('subject') || '');
    const message = String(dados.get('message') || '').trim();

    if (name.length < CONTACT_LIMITS.name.min) return;
    if (message.length < CONTACT_LIMITS.message.min) {
      setStatus(t('contact.min', { min: CONTACT_LIMITS.message.min }));
      return;
    }

    const agora = Date.now();
    const espera = remainingCooldown(COOLDOWN_KEY, COOLDOWN_MS, agora);
    if (espera > 0) {
      setStatus(t('contact.wait', { seconds: espera }));
      return;
    }

    setSending(true);
    setStatus('');
    try {
      await createContactRequest({ name, email, company, subject, message });
      writeLastSentAt(COOLDOWN_KEY, agora);
      form.reset();
      setEnviado(true);
    } catch {
      setStatus(t('contact.failed'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="contato-modal-fundo" role="presentation" onPointerDown={onClose}>
      <div
        className="contato-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contato-modal-titulo"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          className="contato-modal-fechar"
          type="button"
          onClick={onClose}
          aria-label={t('contact.close')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 7 10 10M17 7 7 17" />
          </svg>
        </button>

        {enviado ? (
          <div className="contato-recibo" role="status">
            <h2 id="contato-modal-titulo">{t('contact.received')}</h2>
            <p>
              {t('contact.receivedBody')}
            </p>
            <button className="contato-recibo-fechar" type="button" onClick={onClose}>
              {t('contact.close')}
            </button>
          </div>
        ) : (
          <>
            <h2 id="contato-modal-titulo">{t('contact.formTitle')}</h2>
            <p className="contato-modal-apoio">
              {t('contact.support')}
            </p>

            <form className="contato-form" onSubmit={handleSubmit}>
              <div className="contato-form-linha">
                <div className="contato-campo">
                  <label htmlFor="contato-nome">{t('contact.name')}</label>
                  <input
                    id="contato-nome"
                    name="name"
                    type="text"
                    placeholder={t('contact.namePlaceholder')}
                    minLength={CONTACT_LIMITS.name.min}
                    maxLength={CONTACT_LIMITS.name.max}
                    autoComplete="name"
                    required
                    disabled={!contactConfigured || sending}
                  />
                </div>
                <div className="contato-campo">
                  <label htmlFor="contato-email">{t('contact.email')}</label>
                  <input
                    id="contato-email"
                    name="email"
                    type="email"
                    placeholder={t('contact.emailPlaceholder')}
                    maxLength={CONTACT_LIMITS.email.max}
                    autoComplete="email"
                    required
                    disabled={!contactConfigured || sending}
                  />
                </div>
              </div>

              <div className="contato-form-linha">
                <div className="contato-campo">
                  <label htmlFor="contato-empresa">{t('contact.company')} <span>({t('contact.optional')})</span></label>
                  <input
                    id="contato-empresa"
                    name="company"
                    type="text"
                    placeholder={t('contact.companyPlaceholder')}
                    maxLength={CONTACT_LIMITS.company.max}
                    autoComplete="organization"
                    disabled={!contactConfigured || sending}
                  />
                </div>
                <div className="contato-campo">
                  <label htmlFor="contato-assunto">{t('contact.subject')}</label>
                  <select
                    id="contato-assunto"
                    name="subject"
                    defaultValue={CONTACT_SUBJECTS[0].value}
                    disabled={!contactConfigured || sending}
                  >
                    {CONTACT_SUBJECTS.map((item) => (
                      <option key={item.value} value={item.value}>{t(`contact.subjects.${item.value}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="contato-campo">
                <label htmlFor="contato-mensagem">{t('contact.request')}</label>
                <textarea
                  id="contato-mensagem"
                  name="message"
                  placeholder={t('contact.requestPlaceholder')}
                  minLength={CONTACT_LIMITS.message.min}
                  maxLength={CONTACT_LIMITS.message.max}
                  rows="6"
                  required
                  disabled={!contactConfigured || sending}
                />
              </div>

              <input
                className="contato-armadilha"
                name="website"
                type="text"
                tabIndex="-1"
                autoComplete="off"
                aria-hidden="true"
              />

              <div className="contato-form-rodape">
                <span>
                  {contactConfigured
                    ? t('contact.max', { max: CONTACT_LIMITS.message.max })
                    : t('contact.unavailable')}
                </span>
                <BubbleButton
                  className="contato-enviar"
                  type="submit"
                  icon="send"
                  label={t('contact.send')}
                  loading={sending}
                  loadingLabel={t('contact.sending')}
                  disabled={!contactConfigured || sending}
                />
              </div>
              <p className="contato-status" aria-live="polite">{status}</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
