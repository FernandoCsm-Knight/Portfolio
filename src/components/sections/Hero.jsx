import { memo } from 'react';
import { FaBrain, FaCube, FaGaugeHigh } from 'react-icons/fa6';
import { FANNAR_URL } from '../../data/seo';
import { useI18n } from '../../i18n/context';
import ScrollHint from './ScrollHint';

function Hero() {
  const { t } = useI18n();
  const competencias = [
    { label: t('hero.graphics'), Icone: FaCube },
    /* O círculo de IA leva ao Fannar, o site de interpretabilidade de modelos. */
    { label: t('hero.aiFannar'), Icone: FaBrain, href: FANNAR_URL, linkLabel: t('pricing.fannar') },
    { label: t('hero.performance'), Icone: FaGaugeHigh },
  ];
  return (
    <section id="home" className="hero-superficie">
      <div className="nome-superficie">
        <h1 aria-label="Fernando Dal' Maria">
          <a className="nome-link" href="/contact" aria-label={t('hero.nameContact')}>
            <span className="nome-palavra" aria-hidden="true">Fernando</span>
            <span className="nome-palavra nome-destaque" aria-hidden="true">Dal&apos;</span>
            <span className="nome-palavra nome-destaque" aria-hidden="true">Maria</span>
          </a>
        </h1>
        <span className="bolhas-nome" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i /><i />
        </span>
      </div>
      <p className="hero-tagline">{t('hero.tagline')}</p>
      <ul className="competencias-flutuantes" aria-label={t('hero.areas')}>
        {competencias.map(({ label, Icone, href, linkLabel }) => (href ? (
          <li key={label} className="competencia-icone competencia-com-link" data-label={label}>
            <a className="competencia-link" href={href} aria-label={linkLabel}>
              <Icone aria-hidden="true" />
            </a>
          </li>
        ) : (
          <li
            key={label}
            className="competencia-icone"
            aria-label={label}
            data-label={label}
            tabIndex="0"
          >
            <Icone aria-hidden="true" />
          </li>
        )))}
      </ul>
      <ScrollHint />
    </section>
  );
}

export default memo(Hero);
