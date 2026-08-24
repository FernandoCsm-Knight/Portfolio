import { useEffect } from 'react';

/* Distância do topo da viewport onde o alvo deve parar (34% ≈ um terço da
   tela), e a pausa antes de começar a descer — tempo de a cena aparecer
   primeiro, para o movimento ler como "início do mergulho" e não como um
   salto de layout. */
const POSICAO_ALVO = 0.34;
const ATRASO_MS = 700;

/**
 * Desce levemente a página no carregamento até enquadrar `seletor` (o nome, na
 * home). A altura da seção é medida no momento, não fixada em pixels: assim o
 * enquadramento continua certo se `--altura-secao`, a fonte ou a viewport
 * mudarem.
 */
export function useIntroScroll(seletor) {
  useEffect(() => {
    /* Não sequestrar a rolagem de quem não está começando do topo: recarga no
       meio da página (o navegador restaura a posição) ou chegada por âncora,
       como o /#projetos de volta do mapa. */
    if (window.scrollY > 0 || window.location.hash) return undefined;

    let cancelado = false;
    function cancelar() {
      cancelado = true;
    }
    /* qualquer intenção de rolar do usuário tem precedência sobre a animação */
    const eventos = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    eventos.forEach((evento) => window.addEventListener(evento, cancelar, { passive: true }));

    const temporizador = setTimeout(() => {
      /* fontes ainda carregando mudam a altura do texto e, com ela, a posição
         do nome — medir antes disso enquadra errado. */
      const pronto = document.fonts?.ready ?? Promise.resolve();
      pronto.then(() => {
        if (cancelado || window.scrollY > 0) return;
        const alvo = document.querySelector(seletor);
        if (!alvo) return;

        const { top } = alvo.getBoundingClientRect();
        const destino = Math.max(0, window.scrollY + top - window.innerHeight * POSICAO_ALVO);
        const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: destino, behavior: reduzMovimento ? 'instant' : 'smooth' });
      });
    }, ATRASO_MS);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      eventos.forEach((evento) => window.removeEventListener(evento, cancelar));
    };
  }, [seletor]);
}
