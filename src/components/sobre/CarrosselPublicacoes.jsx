import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { PUBLICACOES } from '../../data/sobre';

export default function CarrosselPublicacoes() {
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
      aria-label="Artigos publicados"
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
                <a className="registro" href={artigo.href} target="_blank" rel="noreferrer">
                  {/* Sem texto visível, o alt é o único nome acessível do link:
                      precisa dizer o artigo inteiro, não "miniatura". */}
                  <img
                    src={artigo.miniatura}
                    alt={`${artigo.titulo} — ${artigo.veiculo}`}
                    width={artigo.largura}
                    height={artigo.altura}
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="carrossel-controles">
        <button type="button" onClick={() => ir(-1)} aria-label="Artigo anterior">
          <FaChevronLeft aria-hidden="true" />
        </button>
        <div className="carrossel-pontos">
          {PUBLICACOES.map((artigo, i) => (
            <button
              key={artigo.doi}
              type="button"
              className={i === indice ? 'ativo' : undefined}
              onClick={() => setIndice(i)}
              aria-label={`Ver o artigo do ${artigo.veiculo}`}
              aria-current={i === indice}
            />
          ))}
        </div>
        <button type="button" onClick={() => ir(1)} aria-label="Próximo artigo">
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
