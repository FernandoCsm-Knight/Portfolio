import { useEffect, useRef, useState } from 'react';
import { PROFUNDIDADE_MAX_M } from '../services/ocean/constants';
import { nomeZona } from '../services/ocean/utils';

const HUD_INICIAL = {
  depthMeters: 0,
  zoneLabel: 'SUPERFÍCIE · EPIPELÁGICA',
  atmValue: 1,
  tempValue: 24,
};

/**
 * Monta a cena 3D do oceano num <canvas> e mantém o HUD (profundidade, zona,
 * pressão e temperatura) sincronizado via estado React — mas só
 * dispara re-render quando o valor exibido realmente muda, já que a cena em
 * si roda seu próprio loop a 60fps por fora do React.
 */
export function useOceanScene(onReady) {
  const canvasRef = useRef(null);
  const fundoRef = useRef(null);
  const generationRef = useRef(0);
  const [hud, setHud] = useState(HUD_INICIAL);
  /* WebGL pode simplesmente não existir (driver bloqueado, GPU em lista negra,
     navegador antigo). Quem consome o hook precisa saber para não deixar a
     página em branco. */
  const [cenaIndisponivel, setCenaIndisponivel] = useState(false);

  useEffect(() => {
    const generation = ++generationRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;
    let cleanupScene = () => {};
    const isCurrent = () => !cancelled && generationRef.current === generation;

    /* Three.js representa quase todo o bundle da aplicação. A cena é carregada
       depois do primeiro paint e apenas quando este canvas realmente existe;
       assim a rota /projetos não baixa nem inicializa a cena da home. */
    async function mountScene() {
      const [{ createOceanScene }] = await Promise.all([
        import('../services/ocean/sceneService'),
        document.fonts?.ready ?? Promise.resolve(),
      ]);
      if (!isCurrent()) return;

      /* O primeiro ciclo de efeitos do StrictMode é desmontado antes deste
         rAF. Só a geração que sobreviver cria um contexto para o canvas. */
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (!isCurrent()) return;

      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const api = createOceanScene(canvas, { reducedMotion });

      api.resize(window.innerWidth, window.innerHeight);
      await api.prepare?.();
      if (!isCurrent()) {
        api.dispose();
        return;
      }
      /* scrollHeight força um recálculo de layout da página inteira — só
         queremos pagar esse custo quando a altura pode ter mudado, nunca a
         cada evento de scroll (a barra de rolagem arrastada dispara scroll com
         muito mais frequência que roda do mouse/trackpad, e recalcular layout a
         cada um deles é o tipo clássico de "layout thrashing" que trava a
         rolagem). */
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

      /* a altura do documento também muda sem resize da janela: fontes que
         terminam de carregar, imagens, conteúdo montado depois. Sem isto o
         scrollMax fica congelado no valor do primeiro frame e a profundidade
         do HUD passa a não bater com a rolagem real. */
      const observadorAltura = new ResizeObserver(medirScrollMax);
      observadorAltura.observe(document.documentElement);

      function handleSubmarineMove(event) {
        const posicao = event.detail;
        if (!posicao?.active) {
          api.clearPointer();
          return;
        }
        api.setPointerNDC(
          (posicao.clientX / window.innerWidth) * 2 - 1,
          -(posicao.clientY / window.innerHeight) * 2 + 1,
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

      function applyScrollProgress() {
        api.setScrollProgress(scrollMax > 0 ? window.scrollY / scrollMax : 0);
      }
      applyScrollProgress();
      let scrollRaf = null;
      function handleScroll() {
        if (scrollRaf !== null) return;
        scrollRaf = requestAnimationFrame(() => {
          scrollRaf = null;
          applyScrollProgress();
        });
      }
      window.addEventListener('scroll', handleScroll, { passive: true });

      let rafId;
      /* 45fps não divide 120Hz nem 60Hz: o cap fazia frames caírem de forma
         irregular (judder visível). 60 divide as duas taxas comuns. */
      const frameInterval = reducedMotion ? 1000 / 30 : 1000 / 60;
      let lastFrameTime = 0;
      let framesAquecidos = 0;
      let last = { depthMeters: -1, zoneLabel: '', atmValue: -1, tempValue: 999 };
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
            zoneLabel: nomeZona(frame.prof),
            atmValue: 1 + Math.round(frame.prof * 100),
            tempValue: Math.round(24 - frame.prof * 20),
          };
          if (
            proximoHud.depthMeters !== last.depthMeters ||
            proximoHud.zoneLabel !== last.zoneLabel ||
            proximoHud.atmValue !== last.atmValue ||
            proximoHud.tempValue !== last.tempValue
          ) {
            last = proximoHud;
            setHud(proximoHud);
          }
        }
      }
      rafId = requestAnimationFrame(loop);

      cleanupScene = () => {
        cancelAnimationFrame(rafId);
        if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
        if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
        observadorAltura.disconnect();
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('ocean-submarine-move', handleSubmarineMove);
        document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
        window.dispatchEvent(new CustomEvent('ocean-fish-hover', { detail: { active: false } }));
        window.removeEventListener('ocean-torpedo-step', handleTorpedoStep);
        window.removeEventListener('scroll', handleScroll);
        api.dispose();
      };
    }

    mountScene().catch((error) => {
      if (!isCurrent()) return;
      console.error('Não foi possível iniciar a cena do oceano.', error);
      setCenaIndisponivel(true);
      onReady?.();
    });

    return () => {
      cancelled = true;
      cleanupScene();
    };
  }, [onReady]);

  return { canvasRef, fundoRef, hud, cenaIndisponivel };
}
