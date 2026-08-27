import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { PUBLICACOES } from '../../data/sobre';
import { useI18n } from '../../i18n/context';
import { EXTERNAL_LINK_PROPS } from '../../utils/links';

export default function CarrosselPublicacoes() {
  const { t } = useI18n();
  const [indice, setIndice] = useState(0);
  const total = PUBLICACOES.length;

  function ir(passo) {
    setIndice((atual) => (atual + passo + total) % total);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowLeft') ir(-1);
    else if (e.key === 'ArrowRight') ir(1);
    else return;
    e.preventDefault();
  }

  return (
    <div
      className="carrossel"
      role="group"
      aria-roledescription="carrossel"
      aria-label={t('about.published')}
      onKeyDown={handleKeyDown}
    >
      <div className="carrossel-janela">
        <ul className="carrossel-trilha" style={{ transform: `translateX(-${indice * 100}%)` }}>
          {PUBLICACOES.map((artigo, i) => {
            const oculto = i !== indice;
            return (
              /* `inert` tira o slide escondido da ordem de tabulação — sem
                 isso o teclado navegaria para links fora da tela */
              <li key={artigo.doi} className="carrossel-slide" inert={oculto} aria-hidden={oculto}>
                <a className="registro" href={artigo.href} {...EXTERNAL_LINK_PROPS}>
                  <img
                    src={artigo.miniatura}
                    alt={t('about.firstPage', { title: artigo.titulo })}
                    width={artigo.largura}
                    height={artigo.altura}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="registro-info">
                    <span>{artigo.veiculo}</span>
                    <strong>{artigo.titulo}</strong>
                    <small>{t('about.doi')} · {artigo.doi}</small>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="carrossel-controles">
        <button type="button" onClick={() => ir(-1)} aria-label={t('about.previousPaper')}>
          <FaChevronLeft aria-hidden="true" />
        </button>
        <div className="carrossel-pontos">
          {PUBLICACOES.map((artigo, i) => (
            <button
              key={artigo.doi}
              type="button"
              className={i === indice ? 'ativo' : undefined}
              onClick={() => setIndice(i)}
              aria-label={t('about.viewPaper', { venue: artigo.veiculo })}
              aria-current={i === indice}
            />
          ))}
        </div>
        <button type="button" onClick={() => ir(1)} aria-label={t('about.nextPaper')}>
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
