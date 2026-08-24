import { memo } from 'react';
import { CV_LINKS, SOCIAL_LINKS } from '../../data/socialLinks';

function Contact() {
  return (
    <section id="contato">
      <div className="rotulo">TRANSMISSÃO · 1.000M — LEITO OCEÂNICO</div>
      <h2>Canal aberto.</h2>
      <p className="sub">Belo Horizonte, MG · português nativo, inglês fluente.</p>

      <div className="elos-linha">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            {link.label}
          </a>
        ))}
        {CV_LINKS.map((cv) => (
          <a key={cv.label} href={cv.href} title={cv.title} target="_blank" rel="noreferrer">
            CV · {cv.label}
          </a>
        ))}
      </div>
    </section>
  );
}

export default memo(Contact);
