import { useEffect, useRef, useState } from 'react';
import { PROJECTS } from '../../data/projects';
import { createProjectMapScene } from '../../services/projectMap/sceneService';
import VoltarAoMergulho from '../VoltarAoMergulho';

export default function ProjectMapPage({ onReady }) {
  const canvasRef = useRef(null);
  const generationRef = useRef(0);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    const generation = ++generationRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let api;
    let ativo = true;
    let rafId;
    let resizeRaf = null;
    let pendingPointer = null;
    let lastFrameTime = 0;
    let framesAquecidos = 0;
    const isCurrent = () => ativo && generationRef.current === generation;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* 60 divide 60Hz e 120Hz; 45 não dividia nenhum dos dois e produzia judder */
    const frameInterval = reducedMotion ? 1000 / 30 : 1000 / 60;

    function handleResize() {
      if (resizeRaf !== null) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        api?.resize(window.innerWidth, window.innerHeight);
      });
    }

    function handlePointerMove(e) {
      pendingPointer = { x: e.clientX, y: e.clientY };
    }

    function handlePointerLeave() {
      pendingPointer = null;
      api?.clearPointer();
    }

    function handleClick() {
      const projeto = api?.handleClick();
      if (!projeto?.href || projeto.href === '#') return;
      window.open(projeto.href, '_blank', 'noopener,noreferrer');
    }

    /* Mesmo evento que a cena do oceano dispara na home, então o rótulo do
       cursor (#c-alvo) e o realce do anel funcionam aqui sem nenhum código
       novo do lado do cursor. */
    let ultimoHover = null;
    function anunciarHover(projeto) {
      window.dispatchEvent(new CustomEvent('ocean-project-hover', {
        detail: {
          active: Boolean(projeto),
          title: projeto?.title || '',
          rotulo: 'PROJETO',
        },
      }));
    }

    function loop(now) {
      rafId = requestAnimationFrame(loop);
      if (document.hidden || now - lastFrameTime < frameInterval) return;
      lastFrameTime = now - ((now - lastFrameTime) % frameInterval);
      if (pendingPointer) {
        api?.updatePointer(pendingPointer.x, pendingPointer.y);
        pendingPointer = null;
      }
      const frame = api?.update();
      if (frame && framesAquecidos < 4) {
        framesAquecidos++;
        if (framesAquecidos === 4) onReady?.();
      }
      const hover = frame?.hoveredProject ?? null;
      if (hover !== ultimoHover) {
        ultimoHover = hover;
        anunciarHover(hover);
      }
    }

    async function iniciarMapa() {
      if (document.fonts?.ready) await document.fonts.ready;
      if (!isCurrent()) return;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (!isCurrent()) return;

      const novaApi = createProjectMapScene(canvas, PROJECTS, { reducedMotion });
      novaApi.resize(window.innerWidth, window.innerHeight);
      await novaApi.prepare?.();
      if (!isCurrent()) {
        novaApi.dispose();
        return;
      }
      api = novaApi;
      window.addEventListener('resize', handleResize);
      canvas.addEventListener('pointermove', handlePointerMove);
      canvas.addEventListener('pointerleave', handlePointerLeave);
      canvas.addEventListener('click', handleClick);
      rafId = requestAnimationFrame(loop);
    }

    /* WebGL pode não estar disponível: sem o catch a rota fica numa tela
       vazia sem nenhuma saída além do botão voltar do navegador. */
    iniciarMapa().catch((error) => {
      if (!isCurrent()) return;
      console.error('Não foi possível iniciar o mapa de expedições.', error);
      setFalhou(true);
      onReady?.();
    });

    return () => {
      ativo = false;
      cancelAnimationFrame(rafId);
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('click', handleClick);
      /* sem isto o rótulo fica preso na tela ao voltar para a home */
      anunciarHover(null);
      document.body.style.overflow = overflowAnterior;
      api?.dispose();
    };
  }, [onReady]);

  return (
    <main className="mapa-projetos-page">
      <VoltarAoMergulho ancora="#projetos" />
      {/* visor do capacete; o retângulo arredondado do SVG carrega os rebites */}
      <div className="escafandro" aria-hidden="true">
        <svg className="rebites">
          <rect x="0" y="0" width="100%" height="100%" />
        </svg>
      </div>
      <canvas
        ref={canvasRef}
        className="mapa-projetos-canvas"
        aria-label="Mapa interativo de projetos"
        hidden={falhou}
      />
      {/* Fora da vista, como a lista da home: a cena só responde a ponteiro e
          a WebGL, então sem isto a rota seria um beco sem saída para teclado e
          leitor de tela. Reaparece quando um link recebe foco. */}
      <ul className="elos elos-mapa">
        {PROJECTS.map((projeto) => (
          <li key={projeto.num}>
            <a href={projeto.href} target="_blank" rel="noreferrer">
              <span className="elo-rotulo">{projeto.num}</span>
              {projeto.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
