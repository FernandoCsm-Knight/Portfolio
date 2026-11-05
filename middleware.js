/* Routing Middleware da Vercel: serve o módulo Fannar (src/fannar) em
   fannar.fernandocsdm.com a partir deste mesmo deploy.

   Não dá para fazer só com `rewrites` no vercel.json: lá o sistema de arquivos
   vem primeiro, e `/` no subdomínio cairia no index.html do portfólio. O
   middleware roda antes do sistema de arquivos.

   - No subdomínio, os caminhos curtos viram os arquivos do módulo; o resto
     (assets com hash, /fannar/casos, /api/contact) passa direto.
   - /docs/… no subdomínio serve a documentação da biblioteca, um site estático
     em public/fannar/docs (gerado no repositório do Fannar por
     scripts/publish_docs.sh). Os links do MkDocs terminam em barra: `/docs/x/`
     vira /fannar/docs/x/index.html, e `/docs/x` ganha a barra por redirect,
     para os caminhos relativos das páginas funcionarem.
   - No domínio do portfólio, quem abrir /fannar.html, /fannar-metodo.html ou
     /fannar/docs/… é levado ao subdomínio, que é o endereço canônico. */

export const config = {
  matcher: ['/', '/metodo', '/metodo/', '/robots.txt', '/sitemap.xml', '/llms.txt', '/favicon.svg',
    '/fannar.html', '/fannar-metodo.html', '/docs', '/docs/:path*', '/fannar/docs/:path*'],
};

const FANNAR_ORIGIN = 'https://fannar.fernandocsdm.com';

const SUBDOMAIN_FILES = {
  '/': '/fannar.html',
  '/metodo': '/fannar-metodo.html',
  '/metodo/': '/fannar-metodo.html',
  '/robots.txt': '/fannar/robots.txt',
  '/sitemap.xml': '/fannar/sitemap.xml',
  '/llms.txt': '/fannar/llms.txt',
  '/favicon.svg': '/fannar/favicon.svg',
};

const CANONICAL = { '/fannar.html': '/', '/fannar-metodo.html': '/metodo' };

/* Mesmo efeito de `next()` e `rewrite()` de @vercel/functions, sem a dependência. */
const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });
const rewrite = (url) => new Response(null, { headers: { 'x-middleware-rewrite': url.toString() } });

/* Arquivo em public/fannar/docs para um caminho /docs/… do subdomínio, ou null
   quando falta a barra final de uma página. */
function docsFile(pathname) {
  const file = `/fannar${pathname}`;
  if (file.endsWith('/')) return `${file}index.html`;
  return /\.[a-z0-9]+$/i.test(file) ? file : null;
}

export default function middleware(request) {
  const url = new URL(request.url);
  const host = (request.headers.get('host') || url.host).toLowerCase();

  if (host.startsWith('fannar.')) {
    if (url.pathname === '/docs' || url.pathname.startsWith('/docs/')) {
      const file = docsFile(url.pathname);
      return file
        ? rewrite(new URL(file + url.search, url))
        : Response.redirect(new URL(`${url.pathname}/${url.search}`, url), 308);
    }
    const file = SUBDOMAIN_FILES[url.pathname];
    return file ? rewrite(new URL(file + url.search, url)) : next();
  }

  /* Só no domínio de produção: em deploys de preview (*.vercel.app) e no
     localhost as páginas continuam abertas pelo nome do arquivo, para teste. */
  if (host === 'fernandocsdm.com' || host === 'www.fernandocsdm.com') {
    if (CANONICAL[url.pathname]) {
      return Response.redirect(`${FANNAR_ORIGIN}${CANONICAL[url.pathname]}${url.search}`, 308);
    }
    if (url.pathname.startsWith('/fannar/docs/')) {
      const path = url.pathname.slice('/fannar'.length).replace(/index\.html$/, '');
      return Response.redirect(`${FANNAR_ORIGIN}${path}${url.search}`, 308);
    }
  }
  return next();
}
