import { useMemo } from 'react';
import { useProjectMapScene } from '../../hooks/useProjectMapScene';
import { useI18n } from '../../i18n/context';
import { EXTERNAL_LINK_PROPS } from '../../utils/links';

export default function ProjectMapPage({ onReady }) {
  const { t, locale } = useI18n();
  const labels = useMemo(() => t('projects'), [t]);
  const { canvasRef, falhou, projetosVazios, projects } = useProjectMapScene(onReady, { labels, locale });

  return (
    <main className="mapa-projetos-page">
      <canvas
        ref={canvasRef}
        className="mapa-projetos-canvas"
        aria-label={labels.map}
        hidden={falhou || projetosVazios}
      />
      {projetosVazios && <p className="mapa-projetos-vazio">{labels.empty}</p>}
      {/* Fora da vista, como a lista da home: a cena só responde a ponteiro e
          a WebGL, então sem isto a rota seria um beco sem saída para teclado e
          leitor de tela. Reaparece quando um link recebe foco. */}
      <ul className="elos elos-mapa">
        {projects.map((projeto) => (
          <li key={projeto.num}>
            <a href={projeto.href} {...EXTERNAL_LINK_PROPS}>
              <span className="elo-rotulo">{projeto.num}</span>
              {projeto.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
