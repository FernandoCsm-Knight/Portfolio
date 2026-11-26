import { useCallback, useRef, useState } from 'react';
import { PROFUNDIDADE_MAX_M } from '../services/ocean/constants';
import { criarFundoOceano } from '../services/ocean/backgroundLayers';
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
    const { createOceanScene } = await import('../services/ocean/sceneService');
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
       irregular (judder visível). 60 divide as duas taxas comuns. O celular
       também roda a 60: a câmera acompanha a rolagem, e com a cena a 30fps o
       fundo andava em degraus enquanto o texto deslizava a 60/120Hz. O custo
       extra foi compensado com menos pixels (teto de DPR e sem MSAA). */
    const frameInterval = reducedMotion ? 1000 / 30 : 1000 / 60;
    /* Os timestamps do rAF oscilam ~1ms. Sem folga, um quadro que chega a
       16,5ms de um intervalo de 16,7 é pulado e o seguinte sai com o dobro do
       tempo — o ritmo vira 16/33/16/33, pior que um teto estável. */
    const toleranciaFrame = 2;
    let lastFrameTime = 0;
    let framesAquecidos = 0;
    let last = { depthMeters: -1 };
    let ultimoHudUpdate = 0;
    let ultimoHoverPeixe = false;
    const fundo = fundoRef.current ? criarFundoOceano(fundoRef.current) : null;
    function loop(now) {
      rafId = requestAnimationFrame(loop);
      if (document.hidden) return;
      const decorrido = now - lastFrameTime;
      if (decorrido < frameInterval - toleranciaFrame) return;
      /* Avança a grade de tempo em passos fixos para manter o ritmo médio;
         depois de uma pausa longa (aba oculta, travada) recomeça do agora. */
      lastFrameTime = decorrido > frameInterval * 2 ? now : lastFrameTime + frameInterval;
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

      /* Só opacidades: barato o bastante para acompanhar todo quadro. */
      fundo?.update(frame.prof);

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
      fundo?.dispose();
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
