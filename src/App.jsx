import './styles/global.css';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import CustomCursor from './components/CustomCursor';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './components/HomePage';
import LoadingScreen from './components/LoadingScreen';

/* cena 3D separada e pesada (Three.js) usada só em /projetos — não deve
   entrar no bundle/execução inicial de quem visita a home. */
const ProjectMapPage = lazy(() => import('./components/projects/ProjectMapPage'));
const AboutPage = lazy(() => import('./components/sobre/AboutPage'));

/* '/' vira ''; '/portfolio/' vira '/portfolio'. Sem isto o roteador compara a
   rota crua contra '/projetos' e nunca casa quando o site é servido de um
   subdiretório (GitHub Pages, por exemplo). */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

function normalizePathname(pathname) {
  let caminho = pathname;
  if (BASE && caminho.startsWith(BASE)) caminho = caminho.slice(BASE.length) || '/';
  return caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho;
}

/* Só estes caminhos são rotas do app. Sem esta lista, qualquer link interno
   para um arquivo estático (os PDFs do currículo em /docs, por exemplo) seria
   engolido pelo roteador: viraria um pushState e renderizaria a home no lugar
   de o navegador abrir o arquivo. */
const ROTAS = ['/', '/projetos', '/sobre'];

function App() {
  const [route, setRoute] = useState(() => normalizePathname(window.location.pathname));
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    function handleRouteChange() {
      const proximaRota = normalizePathname(window.location.pathname);
      /* Mudanças apenas de âncora continuam na mesma página e não remontam a
         cena; abrir o loader nesse caso faria ele esperar por um novo frame de
         inicialização que, corretamente, nunca viria. */
      if (proximaRota === route) return;
      setCarregando(true);
      setRoute(proximaRota);
    }
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [route]);

  /* Impede que a página role por baixo da tela de carregamento. O limite é
     apenas uma rede de segurança para um driver WebGL que pare sem lançar
     erro; normalmente cada página libera a interface no seu primeiro frame. */
  useEffect(() => {
    document.documentElement.classList.toggle('pagina-carregando', carregando);
    document.getElementById('root')?.setAttribute('aria-busy', String(carregando));

    if (!carregando) return undefined;
    const limite = window.setTimeout(() => setCarregando(false), 10000);
    return () => window.clearTimeout(limite);
  }, [carregando, route]);

  useEffect(() => () => {
    document.documentElement.classList.remove('pagina-carregando');
    document.getElementById('root')?.removeAttribute('aria-busy');
  }, []);

  /* Os links entre home e /projetos eram <a> comuns: cada clique recarregava a
     página inteira, o que descartava a cena WebGL já montada e tornava o
     lazy() acima inútil. Aqui a navegação interna passa a usar pushState — o
     que também é o que faz o listener de popstate acima ter alguma função. */
  const handleNavClick = useCallback((e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!link || link.target || link.hasAttribute('download')) return;

    const destino = new URL(link.href, window.location.href);
    if (destino.origin !== window.location.origin) return;
    /* âncora dentro da mesma página (#sobre): rolagem nativa, não é rota */
    if (destino.pathname === window.location.pathname) return;

    const rotaDestino = normalizePathname(destino.pathname);
    if (!ROTAS.includes(rotaDestino)) return;

    e.preventDefault();
    setCarregando(true);
    window.history.pushState({}, '', destino);
    setRoute(rotaDestino);
    requestAnimationFrame(() => {
      if (!destino.hash) {
        window.scrollTo(0, 0);
        return;
      }
      document.querySelector(destino.hash)?.scrollIntoView();
    });
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleNavClick);
    return () => document.removeEventListener('click', handleNavClick);
  }, [handleNavClick]);

  const isProjectMap = route === '/projetos';
  const isSobre = route === '/sobre';
  const handlePageReady = useCallback(() => setCarregando(false), []);

  return (
    <>
      <LoadingScreen visible={carregando} route={route} />
      <CustomCursor />
      <ErrorBoundary
        fallback={<a className="voltar-oceano" href={import.meta.env.BASE_URL}>VOLTAR AO MERGULHO</a>}
      >
        {isProjectMap && (
          <Suspense fallback={null}>
            <ProjectMapPage onReady={handlePageReady} />
          </Suspense>
        )}
        {isSobre && (
          <Suspense fallback={null}>
            <AboutPage onReady={handlePageReady} />
          </Suspense>
        )}
        {!isProjectMap && !isSobre && <HomePage onReady={handlePageReady} />}
      </ErrorBoundary>
    </>
  );
}

export default App;
