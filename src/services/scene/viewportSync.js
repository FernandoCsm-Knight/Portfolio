/**
 * Mantém uma cena sincronizada com o viewport: redimensiona no resize (com
 * throttle via rAF) e reporta o progresso de rolagem (0–1) via
 * `api.setScrollProgress`, recalculando o teto de rolagem sempre que a
 * altura do documento muda — não só no resize da janela, já que fontes e
 * imagens carregando depois do primeiro frame também deslocam esse teto.
 *
 * Usado por useOceanScene e useAboutScene, as duas cenas cuja câmera/HUD
 * dependem da profundidade de rolagem. Devolve a função de limpeza.
 */
/**
 * Largura/altura do viewport de layout — exatamente a caixa que um
 * `position:fixed;inset:0` ocupa. `window.innerWidth` não serve: ele inclui a
 * barra de rolagem clássica no desktop e, no celular, cresce junto com o
 * viewport de layout quando algum elemento estoura na horizontal. Medir por
 * aqui mantém o canvas do tamanho da tela mesmo quando isso acontece.
 */
export function medirViewport() {
  const raiz = document.documentElement;
  return { largura: raiz.clientWidth, altura: raiz.clientHeight };
}

export function attachViewportSync(api) {
  let scrollMax = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  function medirScrollMax() {
    scrollMax = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  }

  let resizeRaf = null;
  function handleResize() {
    if (resizeRaf !== null) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      const { largura, altura } = medirViewport();
      api.resize(largura, altura);
      medirScrollMax();
    });
  }
  window.addEventListener('resize', handleResize);

  const observadorAltura = new ResizeObserver(medirScrollMax);
  observadorAltura.observe(document.documentElement);

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

  return () => {
    if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
    if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('scroll', handleScroll);
    observadorAltura.disconnect();
  };
}
