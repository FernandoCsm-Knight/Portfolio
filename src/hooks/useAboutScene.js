import { useEffect, useRef, useState } from 'react';

/**
 * Monta a cena leve de fundo da página "sobre". Mesma estrutura do
 * useOceanScene — import dinâmico do Three, loop com teto de fps, rAF para
 * scroll/resize — mas sem HUD: esta cena não alimenta nenhum estado React, o
 * que evita qualquer re-render durante a leitura.
 */
export function useAboutScene(onReady) {
  const canvasRef = useRef(null);
  const generationRef = useRef(0);
  const [cenaIndisponivel, setCenaIndisponivel] = useState(false);

  useEffect(() => {
    const generation = ++generationRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelado = false;
    let limparCena = () => {};
    const isCurrent = () => !cancelado && generationRef.current === generation;

    async function montarCena() {
      const [{ createAboutScene }] = await Promise.all([
        import('../services/about/sceneService'),
        document.fonts?.ready ?? Promise.resolve(),
      ]);
      if (!isCurrent()) return;

      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (!isCurrent()) return;

      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const api = createAboutScene(canvas, { reducedMotion });
      api.resize(window.innerWidth, window.innerHeight);
      await api.prepare?.();
      if (!isCurrent()) {
        api.dispose();
        return;
      }

      let scrollMax = document.documentElement.scrollHeight - window.innerHeight;
      function medirScrollMax() {
        scrollMax = document.documentElement.scrollHeight - window.innerHeight;
      }
      let resizeRaf = null;
      function handleResize() {
        if (resizeRaf !== null) return;
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = null;
          api.resize(window.innerWidth, window.innerHeight);
          medirScrollMax();
        });
      }
      window.addEventListener('resize', handleResize);
      const observadorAltura = new ResizeObserver(medirScrollMax);
      observadorAltura.observe(document.documentElement);

      function handlePointerMove(e) {
        api.setPointerNDC(
          (e.clientX / window.innerWidth) * 2 - 1,
          -(e.clientY / window.innerHeight) * 2 + 1,
        );
      }
      window.addEventListener('pointermove', handlePointerMove, { passive: true });

      function aplicarProgresso() {
        api.setScrollProgress(scrollMax > 0 ? window.scrollY / scrollMax : 0);
      }
      aplicarProgresso();
      let scrollRaf = null;
      function handleScroll() {
        if (scrollRaf !== null) return;
        scrollRaf = requestAnimationFrame(() => {
          scrollRaf = null;
          aplicarProgresso();
        });
      }
      window.addEventListener('scroll', handleScroll, { passive: true });

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

      limparCena = () => {
        cancelAnimationFrame(rafId);
        if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
        if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
        observadorAltura.disconnect();
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('scroll', handleScroll);
        api.dispose();
      };
    }

    montarCena().catch((error) => {
      if (!isCurrent()) return;
      console.error('Não foi possível iniciar a cena do caderno de bordo.', error);
      setCenaIndisponivel(true);
      onReady?.();
    });

    return () => {
      cancelado = true;
      limparCena();
    };
  }, [onReady]);

  return { canvasRef, cenaIndisponivel };
}
