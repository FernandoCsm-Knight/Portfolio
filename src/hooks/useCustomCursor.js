import { useEffect, useRef } from 'react';

/**
 * Cursor submarino: a luz acompanha o mouse instantaneamente e o veículo
 * segue com lerp, apontando para o deslocamento restante. Alterna a classe
 * "alvo" quando o mouse está sobre um elemento interativo.
 */
export function useCustomCursor({ clickEffectsEnabled = true } = {}) {
  const ringRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!ring || !label) return undefined;

    const mobileMedia = matchMedia('(max-width: 760px)');
    const bolhasClique = new Set();

    function removerBolhaClique(bolha) {
      bolha.remove();
      bolhasClique.delete(bolha);
    }

    function handleMobileBubbleClick(e) {
      if (!mobileMedia.matches || e.button !== 0 || e.defaultPrevented) return;
      if (e.target instanceof Element
          && e.target.closest('a,button,input,textarea,select,[data-alvo]')) return;

      const quantidade = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < quantidade; i++) {
        const bolha = document.createElement('span');
        const tamanho = 5 + Math.random() * 9;
        bolha.className = 'cursor-bolha-clique';
        bolha.setAttribute('aria-hidden', 'true');
        bolha.style.left = `${e.clientX + (Math.random() - 0.5) * 28}px`;
        bolha.style.top = `${e.clientY + (Math.random() - 0.5) * 18}px`;
        bolha.style.setProperty('--bolha-tamanho', `${tamanho}px`);
        bolha.style.setProperty('--bolha-deriva', `${(Math.random() - 0.5) * 62}px`);
        bolha.style.setProperty('--bolha-subida', `${-(e.clientY + tamanho + 24)}px`);
        bolha.style.setProperty('--bolha-duracao', `${2.7 + Math.random() * 1.5}s`);
        bolha.style.setProperty('--bolha-atraso', `${i * 0.045}s`);
        document.body.appendChild(bolha);
        bolhasClique.add(bolha);
        bolha.addEventListener('animationend', () => removerBolhaClique(bolha), { once: true });
      }
    }

    if (clickEffectsEnabled) window.addEventListener('click', handleMobileBubbleClick);

    /* Em telas touch o cursor nem é exibido; não há motivo para manter um
       listener e um loop de animação ativos. */
    if (!matchMedia('(pointer: fine)').matches) {
      return () => {
        window.removeEventListener('click', handleMobileBubbleClick);
        bolhasClique.forEach(removerBolhaClique);
      };
    }

    /* Só agora escondemos o cursor nativo. Enquanto o `cursor:none` era global
       no CSS, qualquer falha em carregar/montar este efeito deixava a página
       sem cursor visível nenhum — e o ponteiro do sistema não volta sozinho. */
    document.body.classList.add('cursor-personalizado');

    const cur = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      rx: window.innerWidth / 2,
      ry: window.innerHeight / 2,
      hover: false,
      fish: false,
      angle: 0,
      ativo: false,
      bloqueiaScroll: false,
    };
    const torpedosAtivos = new Set();
    let nativeMode = false;
    let scrollRafId = null;
    let ultimoScroll = 0;

    function anunciarPosicaoSubmarino(active = cur.ativo) {
      window.dispatchEvent(new CustomEvent('ocean-submarine-move', {
        detail: { clientX: cur.rx, clientY: cur.ry, active },
      }));
    }

    function intensidadeRolagemBorda() {
      if (!cur.ativo || cur.bloqueiaScroll
          || document.documentElement.classList.contains('pagina-carregando')) return 0;
      const margem = Math.min(220, Math.max(130, window.innerHeight * 0.23));
      if (cur.ry < margem) return -Math.min(1, (margem - cur.ry) / margem);
      const inicioBase = window.innerHeight - margem;
      if (cur.ry > inicioBase) return Math.min(1, (cur.ry - inicioBase) / margem);
      return 0;
    }

    function pararRolagemBorda() {
      if (scrollRafId !== null) cancelAnimationFrame(scrollRafId);
      scrollRafId = null;
      ultimoScroll = 0;
      document.documentElement.classList.remove('rolagem-cursor');
    }

    function animarRolagemBorda(agora) {
      const intensidade = intensidadeRolagemBorda();
      if (!intensidade) {
        pararRolagemBorda();
        return;
      }
      if (!ultimoScroll) {
        ultimoScroll = agora;
        scrollRafId = requestAnimationFrame(animarRolagemBorda);
        return;
      }
      const dt = Math.min((agora - ultimoScroll) / 1000, 0.04);
      ultimoScroll = agora;
      const modulo = Math.abs(intensidade);
      const velocidade = 110 * modulo + 900 * modulo * modulo;
      const limite = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const destino = Math.min(limite, Math.max(0, window.scrollY + Math.sign(intensidade) * velocidade * dt));
      if (Math.abs(destino - window.scrollY) < 0.01) {
        pararRolagemBorda();
        return;
      }
      window.scrollTo(0, destino);
      scrollRafId = requestAnimationFrame(animarRolagemBorda);
    }

    function sincronizarRolagemBorda() {
      if (!intensidadeRolagemBorda()) {
        pararRolagemBorda();
      } else if (scrollRafId === null) {
        document.documentElement.classList.add('rolagem-cursor');
        scrollRafId = requestAnimationFrame(animarRolagemBorda);
      }
    }

    function removerTorpedo(torpedo) {
      cancelAnimationFrame(torpedo.rafId);
      torpedo.elemento.remove();
      torpedosAtivos.delete(torpedo);
    }

    function animarTorpedo(torpedo, agora) {
      const dt = Math.min((agora - torpedo.ultimoInstante) / 1000, 0.04);
      torpedo.ultimoInstante = agora;
      torpedo.x += torpedo.dx * torpedo.velocidade * dt;
      torpedo.y += torpedo.dy * torpedo.velocidade * dt;
      torpedo.elemento.style.transform = `translate(${torpedo.x}px,${torpedo.y}px) translate(-50%,-50%) rotate(${torpedo.angulo}rad)`;

      const impacto = { clientX: torpedo.x, clientY: torpedo.y, hit: false };
      window.dispatchEvent(new CustomEvent('ocean-torpedo-step', { detail: impacto }));
      const atingiuBorda = torpedo.x <= 12 || torpedo.x >= window.innerWidth - 12
        || torpedo.y <= 12 || torpedo.y >= window.innerHeight - 12;
      if (impacto.hit || atingiuBorda) {
        removerTorpedo(torpedo);
        return;
      }
      torpedo.rafId = requestAnimationFrame((tempo) => animarTorpedo(torpedo, tempo));
    }

    let rafId = null;
    function animateRing() {
      cur.rx += (cur.x - cur.rx) * 0.18;
      cur.ry += (cur.y - cur.ry) * 0.18;
      anunciarPosicaoSubmarino();
      const dx = cur.x - cur.rx;
      const dy = cur.y - cur.ry;
      const distancia = Math.hypot(dx, dy);
      if (distancia > 0.35) {
        const targetAngle = Math.atan2(dy, dx);
        const angleDelta = Math.atan2(
          Math.sin(targetAngle - cur.angle),
          Math.cos(targetAngle - cur.angle),
        );
        cur.angle += angleDelta * 0.24;
      }
      const scale = cur.hover ? 1.14 : 1;
      ring.style.transform = `translate(${cur.rx}px,${cur.ry}px) translate(-50%,-50%) rotate(${cur.angle}rad) scale(${scale})`;
      ring.classList.toggle('movendo', distancia > 0.8);
      sincronizarRolagemBorda();

      /* O cursor volta a dormir ao convergir. Um novo pointermove o acorda. */
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        rafId = requestAnimationFrame(animateRing);
      } else {
        rafId = null;
      }
    }

    function handlePointerMove(e) {
      if (nativeMode) return;
      cur.ativo = true;
      cur.x = e.clientX;
      cur.y = e.clientY;
      label.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      cur.hover = e.target instanceof Element && !!e.target.closest('a,button,[data-alvo]');
      cur.bloqueiaScroll = e.target instanceof Element
        && !!e.target.closest('a,button,input,textarea,select,[data-alvo],#sonar');
      ring.classList.toggle('alvo', cur.hover);
      if (rafId === null) rafId = requestAnimationFrame(animateRing);
    }

    function handlePointerLeave() {
      cur.ativo = false;
      anunciarPosicaoSubmarino(false);
      pararRolagemBorda();
    }

    function handleClick(e) {
      if (nativeMode || mobileMedia.matches) return;
      if (!cur.ativo || e.button !== 0 || e.defaultPrevented) return;
      if (e.target instanceof Element
          && e.target.closest('a,button,input,textarea,select,[data-alvo]')) return;

      const cos = Math.cos(cur.angle);
      const sin = Math.sin(cur.angle);
      const elemento = document.createElement('span');
      elemento.className = 'cursor-torpedo';
      elemento.setAttribute('aria-hidden', 'true');
      document.body.appendChild(elemento);
      const torpedo = {
        elemento,
        x: cur.rx + cos * 31,
        y: cur.ry + sin * 31,
        dx: cos,
        dy: sin,
        angulo: cur.angle,
        velocidade: 620,
        ultimoInstante: performance.now(),
        rafId: null,
      };
      elemento.style.transform = `translate(${torpedo.x}px,${torpedo.y}px) translate(-50%,-50%) rotate(${torpedo.angulo}rad)`;
      torpedosAtivos.add(torpedo);
      torpedo.rafId = requestAnimationFrame((tempo) => animarTorpedo(torpedo, tempo));
    }

    /* Usado pelo mapa de expedições (/projetos): sua cena dispara este mesmo
       evento ao passar sobre um marcador de projeto. A home não usa mais
       criaturas clicáveis, então aqui só o mapa aciona isto. */
    function handleFishHover(e) {
      if (nativeMode) return;
      cur.fish = Boolean(e.detail?.active);
      ring.classList.toggle('peixe', cur.fish);
      label.classList.toggle('visivel', cur.fish);
      if (cur.fish) {
        label.querySelector('.alvo-rotulo').textContent = e.detail?.rotulo || 'DESTINO';
        label.querySelector('.alvo-titulo').textContent = e.detail?.title || '';
      }
    }

    function handleCreatureHover(e) {
      if (nativeMode) return;
      cur.fish = Boolean(e.detail?.active);
      ring.classList.toggle('peixe', cur.fish);
      if (rafId === null) rafId = requestAnimationFrame(animateRing);
    }

    function handleNativeCursor(e) {
      nativeMode = Boolean(e.detail?.active);
      document.body.classList.toggle('cursor-personalizado', !nativeMode);
      document.body.classList.toggle('cursor-nativo-projetos', nativeMode);
      if (!nativeMode) return;
      cur.ativo = false;
      cur.fish = false;
      pararRolagemBorda();
      ring.classList.remove('alvo', 'peixe', 'movendo');
      label.classList.remove('visivel');
      torpedosAtivos.forEach(removerTorpedo);
      torpedosAtivos.clear();
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);
    if (clickEffectsEnabled) window.addEventListener('click', handleClick);
    window.addEventListener('ocean-project-hover', handleFishHover);
    window.addEventListener('ocean-fish-hover', handleCreatureHover);
    window.addEventListener('ocean-native-cursor', handleNativeCursor);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      pararRolagemBorda();
      document.body.classList.remove('cursor-personalizado');
      document.body.classList.remove('cursor-nativo-projetos');
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('click', handleMobileBubbleClick);
      window.removeEventListener('ocean-project-hover', handleFishHover);
      window.removeEventListener('ocean-fish-hover', handleCreatureHover);
      window.removeEventListener('ocean-native-cursor', handleNativeCursor);
      anunciarPosicaoSubmarino(false);
      torpedosAtivos.forEach(removerTorpedo);
      torpedosAtivos.clear();
      bolhasClique.forEach(removerBolhaClique);
    };
  }, [clickEffectsEnabled]);

  return { ringRef, labelRef };
}
