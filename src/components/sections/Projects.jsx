import { memo } from 'react';
import { OCEAN_TARGETS } from '../../data/oceanTargets';

function Projects() {
  return (
    <section id="projetos">
      <div className="rotulo">PROJETOS SELECIONADOS · ~700M</div>
      <h2>Repositórios, demos e perfis.</h2>
      <p className="sub">
        Uma seleção do que venho construindo — código, protótipos e onde me encontrar.
      </p>

      <ul className="elos elos-visivel">
        {OCEAN_TARGETS.map((alvo) => (
          <li key={alvo.url}>
            <a
              href={alvo.url}
              {...(alvo.url.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <span className="elo-rotulo">{alvo.rotulo}</span>
              {alvo.title}
            </a>
          </li>
        ))}
      </ul>

      <a className="abrir-mapa" href={`${import.meta.env.BASE_URL}projetos`}>
        ABRIR MAPA DE EXPEDIÇÕES
      </a>
    </section>
  );
}

export default memo(Projects);
