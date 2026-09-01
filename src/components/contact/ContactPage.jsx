import { lazy, Suspense, useEffect, useState } from 'react';
import { FaEnvelope, FaGithub, FaLinkedinIn, FaPaperPlane, FaWhatsapp } from 'react-icons/fa';
import { contactConfigured } from '../../services/contact';
import { useI18n } from '../../i18n/context';
import { EXTERNAL_LINK_PROPS } from '../../utils/links';

/* O formulário só existe depois do clique: manter fora do chunk da página
   evita carregar o modal inteiro para quem veio só pegar um link de contato. */
const ContactForm = lazy(() => import('./ContactForm'));

const CONTACTS = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: import.meta.env.VITE_LINKEDIN_URL?.trim() || '',
    icon: FaLinkedinIn,
  },
  {
    id: 'gmail',
    label: 'Gmail',
    href: import.meta.env.VITE_MAIL_URL?.trim() || '',
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
    href: import.meta.env.VITE_GITHUB_URL?.trim() || '',
    icon: FaGithub,
  },
];

export default function ContactPage({ onReady }) {
  const { t } = useI18n();
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
        <h1 className="sr-only">{t('contact.title')}</h1>
        <div className="contato-conteudo">
          <div className="contato-radial">
            <svg className="contato-rosa" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                {/* Lâminas côncavas: a cintura puxada para dentro (em vez de um
                    triângulo reto) é o que dá o efeito facetado de bússola
                    de carta náutica gravada. */}
                <path id="ponta-cardeal" d="M50 -8 C52.2 5 54.8 18.5 56 27 L63 50 50 50 Z" />
                <path id="ponta-cardeal-espelho" d="M50 -8 C47.8 5 45.2 18.5 44 27 L37 50 50 50 Z" />
                <path id="ponta-inter" d="M50 7.5 C51.4 18 53 27.5 53.7 34 L57 50 50 50 Z" />
                <path id="ponta-inter-espelho" d="M50 7.5 C48.6 18 47 27.5 46.3 34 L43 50 50 50 Z" />
                <path id="ponta-fina" d="M50 19.5 C50.9 28 52 36.5 52.4 41 L55 50 50 50 Z" />
                <path id="ponta-fina-espelho" d="M50 19.5 C49.1 28 48 36.5 47.6 41 L45 50 50 50 Z" />

                <linearGradient id="latrao-claro" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#f1f4f4" />
                  <stop offset=".46" stopColor="#aeb5b7" />
                  <stop offset="1" stopColor="#555d60" />
                </linearGradient>
                <linearGradient id="latrao-escuro" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#858e91" />
                  <stop offset="1" stopColor="#41484a" />
                </linearGradient>
                <linearGradient id="patina-clara" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#f0f3f2" />
                  <stop offset=".52" stopColor="#9aa2a4" />
                  <stop offset="1" stopColor="#3e4548" />
                </linearGradient>
                <filter id="rosa-brilho" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation=".7" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <circle className="rosa-fundo" cx="50" cy="50" r="45.4" />
              <circle className="rosa-aro rosa-aro-externo" cx="50" cy="50" r="46.2" />
              <circle className="rosa-aro rosa-aro-interno" cx="50" cy="50" r="43.8" />

              <g className="rosa-eixos">
                <line x1="50" y1="8" x2="50" y2="92" />
                <line x1="8" y1="50" x2="92" y2="50" />
                <line x1="20.3" y1="20.3" x2="79.7" y2="79.7" />
                <line x1="79.7" y1="20.3" x2="20.3" y2="79.7" />
              </g>

              <circle className="rosa-anel rosa-anel-medio" cx="50" cy="50" r="34" />
              <circle className="rosa-anel rosa-anel-miolo" cx="50" cy="50" r="22" />

              {/* O aro de graus e suas marcações giram juntos — como o aro
                  serigrafado de uma bússola náutica —, enquanto a agulha (as
                  pontas da rosa) fica fixa apontando para os contatos. */}
              <g className="rosa-anel-graus">
                <circle className="rosa-anel" cx="50" cy="50" r="47" />
                {Array.from({ length: 36 }, (_, i) => i * 10).map((deg) => (
                  <line
                    key={`grau-${deg}`}
                    className={deg % 30 === 0 ? 'rosa-grau rosa-grau-forte' : 'rosa-grau'}
                    x1="50" y1={deg % 30 === 0 ? 2.6 : 4} x2="50" y2="6.4"
                    transform={`rotate(${deg} 50 50)`}
                  />
                ))}
              </g>

              <g className="rosa-pontas" filter="url(#rosa-brilho)">
                {[0, 90, 180, 270].map((deg) => (
                  <g key={`cardeal-${deg}`} transform={`rotate(${deg} 50 50)`}>
                    <use
                      href="#ponta-cardeal"
                      className={`ponta ponta-cardeal-clara${deg === 0 ? ' ponta-norte-clara' : ''}`}
                    />
                    <use
                      href="#ponta-cardeal-espelho"
                      className={`ponta ponta-cardeal-escura${deg === 0 ? ' ponta-norte-escura' : ''}`}
                    />
                  </g>
                ))}
                {[45, 135, 225, 315].map((deg) => (
                  <g key={`inter-${deg}`} transform={`rotate(${deg} 50 50)`}>
                    <use href="#ponta-inter" className="ponta ponta-inter-clara" />
                    <use href="#ponta-inter-espelho" className="ponta ponta-inter-escura" />
                  </g>
                ))}
                {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => (
                  <g key={`fina-${deg}`} transform={`rotate(${deg} 50 50)`}>
                    <use href="#ponta-fina" className="ponta ponta-fina-clara" />
                    <use href="#ponta-fina-espelho" className="ponta ponta-fina-escura" />
                  </g>
                ))}
              </g>

              {/* Miolo raiado atrás do brasão, como o centro gravado de um
                  instrumento de latão — as pontas espiam além da borda do logo. */}
              <g className="rosa-miolo">
                {Array.from({ length: 16 }, (_, i) => i * 22.5).map((deg) => (
                  <line
                    key={`raio-${deg}`}
                    className="rosa-raio"
                    x1="50" y1="32" x2="50" y2="36"
                    transform={`rotate(${deg} 50 50)`}
                  />
                ))}
              </g>
            </svg>

            <div className="contato-logo">
              <img src="/images/flogo.png" alt="Logo Fernando Dal' Maria" />
            </div>

            {CONTACTS.map((contact) => {
              const Icon = contact.icon;
              const content = (
                <Icon aria-hidden="true" />
              );
              return contact.href ? (
                <a
                  key={contact.id}
                  className={`contato-no contato-no-${contact.id}`}
                  href={contact.href}
                  {...(contact.href.startsWith('http') ? EXTERNAL_LINK_PROPS : {})}
                  aria-label={t('contact.via', { channel: contact.label })}
                >
                  {content}
                </a>
              ) : (
                <span
                  key={contact.id}
                  className={`contato-no contato-no-${contact.id} indisponivel`}
                  role="link"
                  aria-disabled="true"
                  title={t('contact.configuration')}
                >
                  {content}
                </span>
              );
            })}
          </div>

          <div className="contato-acao">
            <button
              className="contato-chamada"
              type="button"
              onClick={() => setFormAberto(true)}
              disabled={!contactConfigured}
              title={contactConfigured ? undefined : t('contact.configuration')}
            >
              <FaPaperPlane aria-hidden="true" />
              <span>{t('contact.action')}</span>
            </button>
          </div>
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
