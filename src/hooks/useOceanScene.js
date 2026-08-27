import { useCallback, useRef, useState } from 'react';
import { PROFUNDIDADE_MAX_M } from '../services/ocean/constants';
import { attachViewportSync, medirViewport } from '../services/scene/viewportSync';
import { useSceneMount } from './useSceneMount';

const HUD_INICIAL = {
  depthMeters: 0,
};

/**
 * Monta a cena 3D do oceano num <canvas> e mantém o HUD (profundidade)
 * sincronizado via estado React — mas só dispara re-render quando o valor
 * exibido realmente muda, já que a cena em si roda seu próprio loop a 60fps
 * por fora do React.
 */
export function useOceanScene(onReady) {
  const canvasRef = useRef(null);
  const fundoRef = useRef(null);
  const [hud, setHud] = useState(HUD_INICIAL);

  /* Three.js representa quase todo o bundle da aplicação. A cena é carregada
     depois do primeiro paint e apenas quando este canvas realmente existe;
     assim a rota /projects não baixa nem inicializa a cena da home. */
  const mount = useCallback(async (canvas, { isCurrent }) => {
    const [{ createOceanScene }] = await Promise.all([
      import('../services/ocean/sceneService'),
      document.fonts?.ready ?? Promise.resolve(),
    ]);
    if (!isCurrent()) return undefined;

    /* O primeiro ciclo de efeitos do StrictMode é desmontado antes deste
       rAF. Só a geração que sobreviver cria um contexto para o canvas. */
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (!isCurrent()) return undefined;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const api = createOceanScene(canvas, { reducedMotion });

    const { largura, altura } = medirViewport();
    api.resize(largura, altura);
    await api.prepare?.();
    if (!isCurrent()) {
      api.dispose();
      return undefined;
    }

    const detachViewport = attachViewportSync(api);

    function handleSubmarineMove(event) {
      const posicao = event.detail;
      if (!posicao?.active) {
        api.clearPointer();
        return;
      }
      const viewport = medirViewport();
      api.setPointerNDC(
        (posicao.clientX / viewport.largura) * 2 - 1,
        -(posicao.clientY / viewport.altura) * 2 + 1,
      );
    }
    window.addEventListener('ocean-submarine-move', handleSubmarineMove);
    const handlePointerLeave = () => api.clearPointer?.();
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);

    function handleTorpedoStep(event) {
      const impacto = event.detail;
      if (!impacto || impacto.hit) return;
      impacto.hit = api.handleTorpedoStep(impacto.clientX, impacto.clientY);
    }
    window.addEventListener('ocean-torpedo-step', handleTorpedoStep);

    let rafId;
    /* 45fps não divide 120Hz nem 60Hz: o cap fazia frames caírem de forma
       irregular (judder visível). 60 divide as duas taxas comuns — e 30
       também, que é o teto no celular: este laço era metade de todo o trabalho
       de JS da thread principal durante a rolagem, e a cena é uma ambientação
       de fundo lenta, onde 30fps não se distingue de 60. */
    const telaTatil = matchMedia('(pointer: coarse)').matches;
    const frameInterval = reducedMotion || telaTatil ? 1000 / 30 : 1000 / 60;
    let lastFrameTime = 0;
    let framesAquecidos = 0;
    let last = { depthMeters: -1 };
    let ultimoHudUpdate = 0;
    let ultimoHoverPeixe = false;
    /* evita reescrever o gradiente de tela cheia (#fundo) quando o valor não
       mudou de fato — atribuir o mesmo background ainda pode custar um recálculo
       de estilo em alguns navegadores. */
    let lastBg = { depth: '', surface: '', css: '' };
    function loop(now) {
      rafId = requestAnimationFrame(loop);
      if (document.hidden || now - lastFrameTime < frameInterval) return;
      lastFrameTime = now - ((now - lastFrameTime) % frameInterval);
      const frame = api.update();
      const hoverPeixe = Boolean(frame.fishHovered);
      if (hoverPeixe !== ultimoHoverPeixe) {
        ultimoHoverPeixe = hoverPeixe;
        window.dispatchEvent(new CustomEvent('ocean-fish-hover', {
          detail: { active: hoverPeixe },
        }));
      }

      /* Alguns quadros reais aquecem os caminhos de atualização de buffers
         e o JIT do navegador antes de revelar a página. */
      if (framesAquecidos < 5) {
        framesAquecidos++;
        if (framesAquecidos === 5) onReady?.();
      }

      if (fundoRef.current) {
        if (frame.bgDepth !== lastBg.depth) {
          fundoRef.current.style.setProperty('--bg-depth', frame.bgDepth);
          lastBg.depth = frame.bgDepth;
        }
        if (frame.bgSurface !== lastBg.surface) {
          fundoRef.current.style.setProperty('--bg-surface', frame.bgSurface);
          lastBg.surface = frame.bgSurface;
        }
        if (frame.backgroundCss !== lastBg.css) {
          fundoRef.current.style.background = frame.backgroundCss;
          lastBg.css = frame.backgroundCss;
        }
      }

      /* O HUD não precisa acompanhar os 60 quadros da cena. Limitá-lo a
         10Hz evita reconciliar a árvore React a cada metro percorrido. */
      if (now - ultimoHudUpdate >= 100) {
        ultimoHudUpdate = now;
        const proximoHud = {
          depthMeters: Math.round(frame.prof * PROFUNDIDADE_MAX_M),
        };
        if (proximoHud.depthMeters !== last.depthMeters) {
          last = proximoHud;
          setHud(proximoHud);
        }
      }
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      detachViewport();
      window.removeEventListener('ocean-submarine-move', handleSubmarineMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      window.dispatchEvent(new CustomEvent('ocean-fish-hover', { detail: { active: false } }));
      window.removeEventListener('ocean-torpedo-step', handleTorpedoStep);
      api.dispose();
    };
  }, [onReady]);

  const { cenaIndisponivel } = useSceneMount(canvasRef, mount, onReady, 'a cena do oceano');

  return { canvasRef, fundoRef, hud, cenaIndisponivel };
}
