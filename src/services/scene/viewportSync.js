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
  const raiz = document.documentElement;
  let scrollMax = raiz.scrollHeight - raiz.clientHeight;
  let ultimaLargura = 0;
  let ultimaAltura = 0;

  function medirScrollMax() {
    scrollMax = raiz.scrollHeight - raiz.clientHeight;
  }

  /* Redimensionar a cena realoca o buffer de desenho do WebGL, então só vale
     a pena quando a caixa mudou de fato — o observador abaixo também dispara
     por mudanças de altura do documento, que não mexem no viewport. */
  function sincronizarTamanho() {
    const { largura, altura } = medirViewport();
    if (largura === ultimaLargura && altura === ultimaAltura) return;
    ultimaLargura = largura;
    ultimaAltura = altura;
    api.resize(largura, altura);
  }

  let resizeRaf = null;
  function agendarSincronia() {
    if (resizeRaf !== null) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      sincronizarTamanho();
      medirScrollMax();
    });
  }
  window.addEventListener('resize', agendarSincronia);

  /* Observa a raiz, e não só a janela, porque o surgimento da barra de
     rolagem clássica encolhe o viewport de layout sem disparar evento nenhum
     de resize. A cena é medida enquanto a tela de carregamento ainda segura o
     `overflow:hidden`, isto é, sem barra: sem este observador o canvas ficava
     preso naquela largura — alguns pixels mais largo que a tela — até o
     visitante redimensionar a janela. */
  const observadorRaiz = new ResizeObserver(agendarSincronia);
  observadorRaiz.observe(raiz);

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
    window.removeEventListener('resize', agendarSincronia);
    window.removeEventListener('scroll', handleScroll);
    observadorRaiz.disconnect();
  };
}
