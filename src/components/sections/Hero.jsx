import { memo } from 'react';
import { FaBrain, FaCube, FaGaugeHigh } from 'react-icons/fa6';
import { useI18n } from '../../i18n/context';

function Hero() {
  const { t } = useI18n();
  const competencias = [
    { label: t('hero.graphics'), Icone: FaCube },
    { label: t('hero.ai'), Icone: FaBrain },
    { label: t('hero.performance'), Icone: FaGaugeHigh },
  ];
  return (
    <section id="inicio" className="hero-superficie">
      <div className="nome-superficie">
        <h1 aria-label="Fernando Dal' Maria">
          <span className="nome-palavra" aria-hidden="true">Fernando</span>
          <span className="nome-palavra nome-destaque" aria-hidden="true">Dal&apos;</span>
          <span className="nome-palavra nome-destaque" aria-hidden="true">Maria</span>
        </h1>
        <span className="bolhas-nome" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i /><i />
        </span>
      </div>
      <ul className="competencias-flutuantes" aria-label={t('hero.areas')}>
        {competencias.map(({ label, Icone }) => (
          <li
            key={label}
            className="competencia-icone"
            aria-label={label}
            data-label={label}
            tabIndex="0"
          >
            <Icone aria-hidden="true" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default memo(Hero);
