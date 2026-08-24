import { useEffect, useState } from 'react';

/**
 * Estado de navegação do sonar radial: abre/fecha por proximidade do mouse
 * (com histerese) ou pelo botão, fecha com Esc, e acompanha qual seção está
 * ativa via IntersectionObserver para destacar o item correspondente.
 */
export function useSonarNav(navItems) {
  const [open, setOpen] = useState(false);
  const [activeHref, setActiveHref] = useState(navItems[0]?.href ?? null);
  /* Quem abriu o menu decide se o botão de fechar ainda é necessário: aberto
     pela aproximação do mouse, afastar o mouse já fecha e o X vira ruído no
     meio do sonar; aberto pelo botão (toque, clique ou teclado), não existe
     fechamento automático e o X é a única saída além do Esc. */
  const [abertoPorProximidade, setAbertoPorProximidade] = useState(false);

  function alternarPeloBotao() {
    setAbertoPorProximidade(false);
    setOpen((atual) => !atual);
  }

  function fechar() {
    setAbertoPorProximidade(false);
    setOpen(false);
  }

  useEffect(() => {
    if (matchMedia('(pointer: coarse)').matches) return undefined;
    /* mousemove nativo pode disparar centenas de vezes/s (mouses de alta
       taxa de polling) — acumula a última posição e só calcula a distância
       uma vez por frame, via rAF. */
    let pendingX = 0;
    let pendingY = 0;
    let rafId = null;
    function handlePointerMove(e) {
      pendingX = e.clientX;
      pendingY = e.clientY;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const cx = window.innerWidth - 90;
        const cy = window.innerHeight - 90;
        const d = Math.hypot(pendingX - cx, pendingY - cy);
        if (d < 180) {
          /* o mouse estar aqui já garante que afastá-lo fecha o menu, mesmo
             que a abertura tenha vindo do botão — daí marcar sempre. */
          setOpen(true);
          setAbertoPorProximidade(true);
        } else if (d > 320) {
          fechar(); // histerese
        }
      });
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') fechar();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    /* Observa exatamente as seções que a navegação referencia, resolvidas pelo
       href de cada item. Antes isto era `querySelectorAll('section')`, que
       varria o documento inteiro: qualquer <section> alheia à navegação (ou de
       outra rota) entrava na conta e podia marcar um item inexistente. */
    const alvos = navItems
      .map((item) => ({ href: item.href, el: document.getElementById(item.href.slice(1)) }))
      .filter((alvo) => alvo.el);
    if (!alvos.length) return undefined;
    const hrefPorElemento = new Map(alvos.map((alvo) => [alvo.el, alvo.href]));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const href = hrefPorElemento.get(entry.target);
          if (href) setActiveHref(href);
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    alvos.forEach((alvo) => io.observe(alvo.el));
    return () => io.disconnect();
  }, [navItems]);

  return { open, activeHref, abertoPorProximidade, alternarPeloBotao, fechar };
}
