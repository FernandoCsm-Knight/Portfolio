import './styles/global.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import CustomCursor from './components/CustomCursor';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './components/HomePage';
import LanguageSwitcher from './components/LanguageSwitcher';
import LoadingScreen from './components/LoadingScreen';
import SonarNav from './components/SonarNav';
import { useI18n } from './i18n/context';

/* cena 3D separada e pesada (Three.js) usada só em /projects — não deve
   entrar no bundle/execução inicial de quem visita a home. */
const ProjectMapPage = lazy(() => import('./components/projects/ProjectMapPage'));
const AboutPage = lazy(() => import('./components/sobre/AboutPage'));
const ContactPage = lazy(() => import('./components/contact/ContactPage'));
const PricingPage = lazy(() => import('./components/pricing/PricingPage'));
const AdminPage = lazy(() => import('./components/admin/AdminPage'));

function normalizePathname(pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

/* Só estes caminhos são rotas do app. Sem esta lista, qualquer link interno
   para um arquivo estático (os PDFs do currículo em /docs, por exemplo) seria
   engolido pelo roteador: viraria um pushState e renderizaria a home no lugar
   de o navegador abrir o arquivo. */
const ROTAS = ['/', '/projects', '/about', '/pricing', '/contact', '/admin'];

function App() {
  const { t } = useI18n();
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

  /* Os links entre home e /projects eram <a> comuns: cada clique recarregava a
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
    /* âncora dentro da mesma página (#about): rolagem nativa, não é rota */
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

  const isProjectMap = route === '/projects';
  const isSobre = route === '/about';
  const isPrecos = route === '/pricing';
  const isContato = route === '/contact';
  const isAdmin = route === '/admin';
  const handlePageReady = useCallback(() => setCarregando(false), []);

  return (
    <>
      <Analytics />
      <SpeedInsights />
      <LoadingScreen visible={carregando} route={route} />
      <CustomCursor clickEffectsEnabled={route === '/'} />
      {!isAdmin && <LanguageSwitcher />}
      {!isAdmin && <SonarNav route={route} />}
      <ErrorBoundary
        fallback={<a className="voltar-oceano" href="/">{t('common.back')}</a>}
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
        {isPrecos && (
          <Suspense fallback={null}>
            <PricingPage onReady={handlePageReady} />
          </Suspense>
        )}
        {isContato && (
          <Suspense fallback={null}>
            <ContactPage onReady={handlePageReady} />
          </Suspense>
        )}
        {isAdmin && (
          <Suspense fallback={null}>
            <AdminPage onReady={handlePageReady} />
          </Suspense>
        )}
        {!isProjectMap && !isSobre && !isPrecos && !isContato && !isAdmin && <HomePage onReady={handlePageReady} />}
      </ErrorBoundary>
    </>
  );
}

export default App;
