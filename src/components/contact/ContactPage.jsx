import { lazy, Suspense, useEffect, useState } from 'react';
import { FaEnvelope, FaGithub, FaLinkedinIn, FaPaperPlane, FaWhatsapp } from 'react-icons/fa';
import { contactConfigured } from '../../services/contact';

/* O formulário só existe depois do clique: manter fora do chunk da página
   evita carregar o modal inteiro para quem veio só pegar um link de contato. */
const ContactForm = lazy(() => import('./ContactForm'));

const CONTACTS = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/fernandocsdm',
    icon: FaLinkedinIn,
  },
  {
    id: 'gmail',
    label: 'Gmail',
    href: 'mailto:fernandocsdm@gmail.com',
    icon: FaEnvelope,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: import.meta.env.VITE_WHATSAPP_URL?.trim() || '',
    icon: FaWhatsapp,
  },
  {
    id: 'github',
    label: 'GitHub',
    href: 'https://github.com/FernandoCsm-Knight',
    icon: FaGithub,
  },
];

export default function ContactPage({ onReady }) {
  const [formAberto, setFormAberto] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(frame);
  }, [onReady]);

  return (
    <>
      <div id="fundo" className="fundo-caderno" />
      <div id="vinheta" />
      <div className="sobre-overlay contato-overlay" aria-hidden="true" />

      <main className="contato-page">
        <h1 className="sr-only">Contato</h1>
        <div className="contato-conteudo">
          <div className="contato-radial">
            <svg className="contato-conexoes" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="34" />
              <circle cx="50" cy="50" r="22" />
              <line x1="50" y1="50" x2="50" y2="8" />
              <line x1="50" y1="50" x2="92" y2="50" />
              <line x1="50" y1="50" x2="50" y2="92" />
              <line x1="50" y1="50" x2="8" y2="50" />
            </svg>

            <div className="contato-logo">
              <img src={`${import.meta.env.BASE_URL}images/flogo.png`} alt="Logo Fernando Dal' Maria" />
            </div>

            {CONTACTS.map((contact) => {
              const Icon = contact.icon;
              const content = (
                <>
                  <Icon aria-hidden="true" />
                  <span>{contact.label}</span>
                </>
              );
              return contact.href ? (
                <a
                  key={contact.id}
                  className={`contato-no contato-no-${contact.id}`}
                  href={contact.href}
                  {...(contact.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                  aria-label={`Contato por ${contact.label}`}
                >
                  {content}
                </a>
              ) : (
                <span
                  key={contact.id}
                  className={`contato-no contato-no-${contact.id} indisponivel`}
                  role="link"
                  aria-disabled="true"
                  title="Configure VITE_WHATSAPP_URL"
                >
                  {content}
                </span>
              );
            })}
          </div>

          <button
            className="contato-chamada"
            type="button"
            onClick={() => setFormAberto(true)}
            disabled={!contactConfigured}
            title={contactConfigured ? undefined : 'Configure as variáveis do Supabase'}
          >
            <FaPaperPlane aria-hidden="true" />
            <span>Enviar uma demanda</span>
          </button>
        </div>
      </main>

      {formAberto && (
        <Suspense fallback={null}>
          <ContactForm onClose={() => setFormAberto(false)} />
        </Suspense>
      )}
    </>
  );
}
