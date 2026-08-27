import { useCallback, useRef } from 'react';
import { attachViewportSync } from '../services/scene/viewportSync';
import { useSceneMount } from './useSceneMount';

/**
 * Monta a cena leve de fundo da página "sobre". Mesma estrutura do
 * useOceanScene — import dinâmico do Three, loop com teto de fps, sincronia
 * de viewport/scroll — mas sem HUD: esta cena não alimenta nenhum estado
 * React, o que evita qualquer re-render durante a leitura.
 */
export function useAboutScene(onReady) {
  const canvasRef = useRef(null);

  const mount = useCallback(async (canvas, { isCurrent }) => {
    const [{ createAboutScene }] = await Promise.all([
      import('../services/about/sceneService'),
      document.fonts?.ready ?? Promise.resolve(),
    ]);
    if (!isCurrent()) return undefined;

    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (!isCurrent()) return undefined;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const api = createAboutScene(canvas, { reducedMotion });
    api.resize(window.innerWidth, window.innerHeight);
    await api.prepare?.();
    if (!isCurrent()) {
      api.dispose();
      return undefined;
    }

    const detachViewport = attachViewportSync(api);

    function handlePointerMove(e) {
      api.setPointerNDC(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    let rafId;
    const frameInterval = reducedMotion ? 1000 / 30 : 1000 / 60;
    let ultimoFrame = 0;
    let framesAquecidos = 0;
    function loop(now) {
      rafId = requestAnimationFrame(loop);
      if (document.hidden || now - ultimoFrame < frameInterval) return;
      ultimoFrame = now - ((now - ultimoFrame) % frameInterval);
      api.update();
      if (framesAquecidos < 4) {
        framesAquecidos++;
        if (framesAquecidos === 4) onReady?.();
      }
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      detachViewport();
      window.removeEventListener('pointermove', handlePointerMove);
      api.dispose();
    };
  }, [onReady]);

  const { cenaIndisponivel } = useSceneMount(canvasRef, mount, onReady, 'a cena do caderno de bordo');

  return { canvasRef, cenaIndisponivel };
}
