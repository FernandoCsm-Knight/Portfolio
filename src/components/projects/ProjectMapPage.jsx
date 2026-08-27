import { useEffect, useRef, useState } from 'react';
import { PROJECTS } from '../../data/projects';
import { createProjectMapScene } from '../../services/projectMap/sceneService';

export default function ProjectMapPage({ onReady }) {
  const canvasRef = useRef(null);
  const apiRef = useRef(null);
  const generationRef = useRef(0);
  const [falhou, setFalhou] = useState(false);
  const [carrosselVisivel, setCarrosselVisivel] = useState(false);

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
    let dragStartX = null;
    let suppressClick = false;
    let lastFrameTime = 0;
    let framesAquecidos = 0;
    let ultimoEstadoCarrossel = false;
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
      if (dragStartX !== null) api?.dragCarousel(e.clientX - dragStartX, window.innerWidth);
    }

    function handlePointerLeave() {
      pendingPointer = null;
      api?.clearPointer();
    }

    function handleClick(e) {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const projeto = api?.handleClick(e.clientX, e.clientY);
      if (!projeto?.href || projeto.href === '#') return;
      window.open(projeto.href, '_blank', 'noopener,noreferrer');
    }

    function handlePointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      api?.updatePointer(e.clientX, e.clientY);
      dragStartX = e.clientX;
      api?.beginCarouselDrag();
      canvas.classList.add('arrastando');
      canvas.setPointerCapture?.(e.pointerId);
    }

    function handlePointerUp(e) {
      if (dragStartX === null) return;
      const distance = e.clientX - dragStartX;
      dragStartX = null;
      canvas.classList.remove('arrastando');
      const moved = api?.endCarouselDrag(distance) ?? false;
      if (moved) {
        suppressClick = true;
        window.setTimeout(() => { suppressClick = false; }, 80);
      }
    }

    function handlePointerCancel() {
      if (dragStartX !== null) api?.endCarouselDrag(0);
      dragStartX = null;
      canvas.classList.remove('arrastando');
    }

    function handleWheel(e) {
      if (Math.abs(e.deltaX) < 8 && Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      const direction = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      api?.navigateCarousel(direction > 0 ? 1 : -1);
    }

    function handleKeyDown(e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      api?.navigateCarousel(e.key === 'ArrowRight' ? 1 : -1);
    }

    /* Mesmo evento que a cena do oceano dispara na home, então o rótulo do
       cursor (#c-alvo) e o realce do anel funcionam aqui sem nenhum código
       novo do lado do cursor. */
    let ultimoHover = null;
    let ultimoHoverLetra = false;
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
      const hoverLetra = Boolean(frame?.letterHovered);
      const hoverMudou = hover !== ultimoHover;
      if (hoverMudou) {
        ultimoHover = hover;
        anunciarHover(hover);
      }
      if (hoverMudou || hoverLetra !== ultimoHoverLetra) {
        ultimoHoverLetra = hoverLetra;
        canvas.classList.toggle('sobre-card', Boolean(hover) || hoverLetra);
      }
      const estadoCarrossel = Boolean(frame?.carouselVisible);
      if (estadoCarrossel !== ultimoEstadoCarrossel) {
        ultimoEstadoCarrossel = estadoCarrossel;
        setCarrosselVisivel(estadoCarrossel);
      }
    }

    async function iniciarMapa() {
      /* A Norican só é usada para amostrar o glifo no canvas, portanto o
         navegador não a considera necessariamente ao resolver `fonts.ready`.
         A carga explícita impede que a formação nasça com a fonte fallback. */
      if (document.fonts?.load) await document.fonts.load("900px 'Norican'", 'F');
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
      apiRef.current = novaApi;
      window.addEventListener('resize', handleResize);
      canvas.addEventListener('pointermove', handlePointerMove);
      canvas.addEventListener('pointerleave', handlePointerLeave);
      canvas.addEventListener('pointerdown', handlePointerDown);
      canvas.addEventListener('pointerup', handlePointerUp);
      canvas.addEventListener('pointercancel', handlePointerCancel);
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      canvas.addEventListener('click', handleClick);
      window.addEventListener('keydown', handleKeyDown);
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
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('click', handleClick);
      canvas.classList.remove('arrastando', 'sobre-card');
      window.removeEventListener('keydown', handleKeyDown);
      /* sem isto o rótulo fica preso na tela ao voltar para a home */
      anunciarHover(null);
      document.body.style.overflow = overflowAnterior;
      api?.dispose();
      apiRef.current = null;
    };
  }, [onReady]);

  function navegarCarrossel(direction) {
    apiRef.current?.navigateCarousel(direction);
  }

  return (
    <main className="mapa-projetos-page">
      <canvas
        ref={canvasRef}
        className="mapa-projetos-canvas"
        aria-label="Mapa interativo de projetos"
        hidden={falhou}
      />
      <nav
        className={`mapa-carrossel-controles${carrosselVisivel ? ' visivel' : ''}`}
        aria-label="Navegação dos projetos"
        aria-hidden={!carrosselVisivel}
      >
        <button type="button" onClick={() => navegarCarrossel(-1)} aria-label="Projeto anterior">
          <span aria-hidden="true">‹</span>
        </button>
        <button type="button" onClick={() => navegarCarrossel(1)} aria-label="Próximo projeto">
          <span aria-hidden="true">›</span>
        </button>
      </nav>
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
