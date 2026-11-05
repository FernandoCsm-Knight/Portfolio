/* Caminhos do módulo Fannar no navegador.

   Em produção ele é servido em fannar.fernandocsdm.com, onde o middleware da
   raiz do projeto (middleware.js) reescreve `/` para /fannar.html e `/metodo`
   para /fannar-metodo.html: a barra de endereço mostra os caminhos curtos. Fora
   do subdomínio (vite dev, preview, deploy de teste) as páginas são abertas
   pelo nome do arquivo. Os links internos seguem o host em que a página está. */

const onSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith('fannar.');

export const ROUTES = onSubdomain
  ? { home: '/', metodo: '/metodo' }
  : { home: '/fannar.html', metodo: '/fannar-metodo.html' };

export function currentPage() {
  const path = window.location.pathname.replace(/\/+$/, '');
  return path === '/metodo' || path === '/fannar-metodo.html' || path === '/fannar-metodo' ? 'fannar' : 'home';
}

/* Figuras dos casos: public/fannar/casos/<idioma>/<nome>.webp, mesmo caminho
   nos dois hosts. */
export const figureSrc = (locale, name) => `/fannar/casos/${locale}/${name}.webp`;
