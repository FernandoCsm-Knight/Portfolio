import { useCallback, useEffect, useRef, useState } from 'react';
import { createProjectMapScene } from '../services/projectMap/sceneService';
import { listProjects, localizeProject, projectsConfigured } from '../services/projects';
import { useSceneMount } from './useSceneMount';

/**
 * Monta a cena do mapa de expedições (/projects): busca os projetos no
 * Supabase, cria a cena e liga o conjunto bem maior de eventos do carrossel
 * (arraste, roda do mouse, teclado) — por isso não reaproveita
 * `attachViewportSync` como useOceanScene/useAboutScene, só o resize.
 */
export function useProjectMapScene(onReady, { labels, locale }) {
  const canvasRef = useRef(null);
  /* Cache das linhas cruas do Supabase: uma troca de idioma remonta a cena
     (como já acontecia antes, já que `labels`/`t` mudam de referência a cada
     troca), mas não precisa buscar os projetos de novo — só relocaliza. */
  const rowsRef = useRef(null);
  const [projetosVazios, setProjetosVazios] = useState(false);
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

    /* As fontes precisam estar carregadas antes de virar pixels nas texturas:
       document.fonts.ready sozinho nao baixa familias sem uso visivel no DOM. */
    if (document.fonts?.load) {
      await Promise.all([
        document.fonts.load("900px 'Norican'", 'F'),
        document.fonts.load("600 56px 'Playfair Display'", 'Projeto'),
        document.fonts.load('500 24px Roboto', 'Projeto'),
        document.fonts.load('400 26px Roboto', 'Projeto'),
      ]);
    }
    if (document.fonts?.ready) await document.fonts.ready;
    if (!isCurrent()) return undefined;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (!isCurrent()) return undefined;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const api = createProjectMapScene(canvas, projetosLocalizados, { reducedMotion, labels });
    /* A câmera deve usar exatamente a caixa exibida pelo canvas. No mobile,
       a altura do viewport de layout pode incluir a área sob a barra do
       navegador, deixando o card abaixo do centro visível. */
    function canvasSize() {
      const rect = canvas.getBoundingClientRect();
      return { largura: Math.max(1, rect.width), altura: Math.max(1, rect.height) };
    }
    const viewportInicial = canvasSize();
    api.resize(viewportInicial.largura, viewportInicial.altura);
    await api.prepare?.();
    if (!isCurrent()) {
      api.dispose();
      return undefined;
    }

    let resizeRaf = null;
    let ultimaLargura = viewportInicial.largura;
    let ultimaAltura = viewportInicial.altura;
    function handleResize() {
      if (resizeRaf !== null) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        const { largura, altura } = canvasSize();
        if (largura === ultimaLargura && altura === ultimaAltura) return;
        ultimaLargura = largura;
        ultimaAltura = altura;
        api.resize(largura, altura);
      });
    }
    window.addEventListener('resize', handleResize);
    const canvasObserver = new ResizeObserver(handleResize);
    canvasObserver.observe(canvas);

    let pendingPointer = null;
    let dragStartX = null;
    let pressedLetter = false;

    function handlePointerMove(e) {
      pendingPointer = { x: e.clientX, y: e.clientY };
      if (dragStartX !== null) api.dragCarousel(e.clientX - dragStartX, canvasSize().largura);
    }
    function handlePointerLeave() {
      pendingPointer = null;
      api.clearPointer();
    }
    function openProjectAt(clientX, clientY) {
      const projeto = api.handleClick(clientX, clientY);
      if (!projeto?.href || projeto.href === '#') return;
      window.open(projeto.href, '_blank', 'noopener,noreferrer');
    }
    function handlePointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      api.updatePointer(e.clientX, e.clientY);
      if (api.triggerLetterAt(e.clientX, e.clientY)) {
        pressedLetter = true;
        canvas.setPointerCapture?.(e.pointerId);
        return;
      }
      if (!api.beginCarouselDrag()) return;
      dragStartX = e.clientX;
      canvas.classList.add('arrastando');
      canvas.setPointerCapture?.(e.pointerId);
    }
    function handlePointerUp(e) {
      if (pressedLetter) {
        pressedLetter = false;
        return;
      }
      if (dragStartX === null) {
        openProjectAt(e.clientX, e.clientY);
        return;
      }
      const distance = e.clientX - dragStartX;
      api.dragCarousel(distance, canvasSize().largura);
      dragStartX = null;
      canvas.classList.remove('arrastando');
      const moved = api.endCarouselDrag(distance) ?? false;
      if (!moved) openProjectAt(e.clientX, e.clientY);
    }
    function handlePointerCancel() {
      if (dragStartX !== null) api.endCarouselDrag(0, true);
      dragStartX = null;
      pressedLetter = false;
      canvas.classList.remove('arrastando');
    }
    function handleWheel(e) {
      if (Math.abs(e.deltaX) < 0.01 && Math.abs(e.deltaY) < 0.01) return;
      e.preventDefault();
      const direction = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      api.spinCarouselWheel(direction * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1));
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
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      window.removeEventListener('resize', handleResize);
      canvasObserver.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.classList.remove('arrastando', 'sobre-card');
      window.removeEventListener('keydown', handleKeyDown);
      /* sem isto o rótulo fica preso na tela ao voltar para a home */
      anunciarHover(null);
      api.dispose();
    };
  }, [labels, locale, onReady]);

  const { cenaIndisponivel: falhou } = useSceneMount(canvasRef, mount, onReady, 'o mapa de expedições');

  return {
    canvasRef, falhou, projetosVazios, projects,
  };
}
