import { useCallback, useEffect, useRef, useState } from 'react';
import { createProjectMapScene } from '../services/projectMap/sceneService';
import { listProjects, localizeProject, projectsConfigured } from '../services/projects';
import { medirViewport } from '../services/scene/viewportSync';
import { useSceneMount } from './useSceneMount';

/**
 * Monta a cena do mapa de expedições (/projects): busca os projetos no
 * Supabase, cria a cena e liga o conjunto bem maior de eventos do carrossel
 * (arraste, roda do mouse, teclado) — por isso não reaproveita
 * `attachViewportSync` como useOceanScene/useAboutScene, só o resize.
 */
export function useProjectMapScene(onReady, { labels, locale }) {
  const canvasRef = useRef(null);
  const apiRef = useRef(null);
  /* Cache das linhas cruas do Supabase: uma troca de idioma remonta a cena
     (como já acontecia antes, já que `labels`/`t` mudam de referência a cada
     troca), mas não precisa buscar os projetos de novo — só relocaliza. */
  const rowsRef = useRef(null);
  const [projetosVazios, setProjetosVazios] = useState(false);
  const [carrosselVisivel, setCarrosselVisivel] = useState(false);
  const [projects, setProjects] = useState([]);

  /* Trava o scroll da página enquanto o mapa ocupa a tela inteira — sempre
     restaura ao sair, mesmo que a cena não chegue a montar (Supabase fora do
     ar, WebGL indisponível etc.), por isso fica fora do ciclo de vida da
     cena em si. */
  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflowAnterior; };
  }, []);

  const mount = useCallback(async (canvas, { isCurrent }) => {
    if (!projectsConfigured) {
      setProjetosVazios(true);
      onReady?.();
      return undefined;
    }
    rowsRef.current ??= await listProjects();
    if (!isCurrent()) return undefined;
    if (!rowsRef.current.length) {
      setProjetosVazios(true);
      onReady?.();
      return undefined;
    }
    const projetosLocalizados = rowsRef.current.map((row, index) => ({
      ...localizeProject(row, locale),
      num: String(index + 1).padStart(2, '0'),
    }));
    setProjects(projetosLocalizados);

    /* A Norican só é usada no canvas que amostra o glifo do monograma. */
    if (document.fonts?.load) await document.fonts.load("900px 'Norican'", 'F');
    if (document.fonts?.ready) await document.fonts.ready;
    if (!isCurrent()) return undefined;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (!isCurrent()) return undefined;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const api = createProjectMapScene(canvas, projetosLocalizados, { reducedMotion, labels });
    const viewportInicial = medirViewport();
    api.resize(viewportInicial.largura, viewportInicial.altura);
    await api.prepare?.();
    if (!isCurrent()) {
      api.dispose();
      return undefined;
    }
    apiRef.current = api;

    let resizeRaf = null;
    function handleResize() {
      if (resizeRaf !== null) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        const { largura, altura } = medirViewport();
        api.resize(largura, altura);
      });
    }
    window.addEventListener('resize', handleResize);

    let pendingPointer = null;
    let dragStartX = null;
    let suppressClick = false;

    function handlePointerMove(e) {
      pendingPointer = { x: e.clientX, y: e.clientY };
      if (dragStartX !== null) api.dragCarousel(e.clientX - dragStartX, medirViewport().largura);
    }
    function handlePointerLeave() {
      pendingPointer = null;
      api.clearPointer();
    }
    function handleClick(e) {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const projeto = api.handleClick(e.clientX, e.clientY);
      if (!projeto?.href || projeto.href === '#') return;
      window.open(projeto.href, '_blank', 'noopener,noreferrer');
    }
    function handlePointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      api.updatePointer(e.clientX, e.clientY);
      dragStartX = e.clientX;
      api.beginCarouselDrag();
      canvas.classList.add('arrastando');
      canvas.setPointerCapture?.(e.pointerId);
    }
    function handlePointerUp(e) {
      if (dragStartX === null) return;
      const distance = e.clientX - dragStartX;
      dragStartX = null;
      canvas.classList.remove('arrastando');
      const moved = api.endCarouselDrag(distance) ?? false;
      if (moved) {
        suppressClick = true;
        window.setTimeout(() => { suppressClick = false; }, 80);
      }
    }
    function handlePointerCancel() {
      if (dragStartX !== null) api.endCarouselDrag(0);
      dragStartX = null;
      canvas.classList.remove('arrastando');
    }
    function handleWheel(e) {
      if (Math.abs(e.deltaX) < 8 && Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      const direction = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      api.navigateCarousel(direction > 0 ? 1 : -1);
    }
    function handleKeyDown(e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      api.navigateCarousel(e.key === 'ArrowRight' ? 1 : -1);
    }

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    /* Mesmo evento que a cena do oceano dispara na home, então o rótulo do
       cursor (#c-alvo) e o realce do anel funcionam aqui sem nenhum código
       novo do lado do cursor. */
    function anunciarHover(projeto) {
      window.dispatchEvent(new CustomEvent('ocean-project-hover', {
        detail: {
          active: Boolean(projeto),
          title: projeto?.title || '',
          rotulo: labels.project,
        },
      }));
    }

    let rafId;
    /* 60 divide 60Hz e 120Hz; 45 não dividia nenhum dos dois e produzia judder */
    const frameInterval = reducedMotion ? 1000 / 30 : 1000 / 60;
    let lastFrameTime = 0;
    let framesAquecidos = 0;
    let ultimoHover = null;
    let ultimoHoverLetra = false;
    let ultimoEstadoCarrossel = false;
    function loop(now) {
      rafId = requestAnimationFrame(loop);
      if (document.hidden || now - lastFrameTime < frameInterval) return;
      lastFrameTime = now - ((now - lastFrameTime) % frameInterval);
      if (pendingPointer) {
        api.updatePointer(pendingPointer.x, pendingPointer.y);
        pendingPointer = null;
      }
      const frame = api.update();
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
    rafId = requestAnimationFrame(loop);

    return () => {
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
      api.dispose();
      apiRef.current = null;
    };
  }, [labels, locale, onReady]);

  const { cenaIndisponivel: falhou } = useSceneMount(canvasRef, mount, onReady, 'o mapa de expedições');

  return {
    canvasRef, apiRef, falhou, projetosVazios, carrosselVisivel, projects,
  };
}
