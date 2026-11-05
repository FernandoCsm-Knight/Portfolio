/* Plugin de build do módulo Fannar (registrado em vite.config.js da raiz).

   As páginas do Fannar (fannar.html e fannar-metodo.html) são SPAs: sem JS,
   crawlers de busca e de IA veriam um <div> vazio. Este plugin gera, a partir
   do mesmo content.js que o React usa:
   - um HTML semântico dentro do #root de cada página (substituído quando o
     React monta);
   - fannar/llms.txt, com o conteúdo das duas páginas em markdown (EN e PT),
     servido como /llms.txt no subdomínio pelo middleware.js. */

import { CONTENT } from './content.js';
import { CONTACT_URL, FANNAR_PATH, HOURLY_URL, PACKAGE_PRICES, PORTFOLIO_URL, PRICE_CURRENCY, REPO_URL, SITE_URL } from './config.js';

/* Entradas HTML do módulo, para o build.rollupOptions.input da raiz. */
export const FANNAR_PAGES = { fannar: 'fannar.html', 'fannar-metodo': 'fannar-metodo.html' };

export const isFannarPage = (path) => /^\/fannar(-metodo)?\.html$/.test(path);

const esc = (text) =>
  String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function priceText(locale, id) {
  const c = CONTENT[locale];
  const currency = PRICE_CURRENCY[locale] ?? 'USD';
  const amount = PACKAGE_PRICES[id]?.[currency];
  if (amount == null) return c.packages.onRequest;
  const value = new Intl.NumberFormat(c.localeTag, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  return `${c.packages.priceFrom} ${value}`;
}

const hidden = 'position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
const li = (html) => `<li>${html}</li>`;
const pairs = (items) => `<ul>${items.map(([t, b]) => li(`<strong>${esc(t)}</strong>: ${esc(b)}`)).join('')}</ul>`;

function homeHtml() {
  const c = CONTENT.pt;
  return `<main style="${hidden}">
      <h1>${esc(c.hero.title)}</h1>
      <p>${esc(c.hero.lead)}</p>
      <h2>${esc(c.services.title)}</h2>
      <p>${esc(c.services.lead)}</p>
      ${pairs(c.services.items)}
      <h2>${esc(c.showcase.title)}</h2>
      <p>${esc(c.showcase.lead)} <a href="${FANNAR_PATH}">${esc(c.showcase.button)}</a></p>
      <h2>${esc(c.packages.title)}</h2>
      <ul>${c.packages.items.map((p) => li(`<strong>${esc(p.name)}</strong> (${esc(p.duration)}, ${esc(priceText('pt', p.id))}): ${esc(p.summary)} ${esc(p.deliverables.join('; '))}.`)).join('')}</ul>
      <h2>${esc(c.process.title)}</h2>
      ${pairs(c.process.steps)}
      <h2>${esc(c.limits.title)}</h2>
      <p>${esc(c.limits.body)}</p>
      <h2>${esc(c.faq.title)}</h2>
      ${pairs(c.faq.items)}
      <p><a href="${esc(CONTACT_URL)}">${esc(c.cta.button)}</a> · <a href="${esc(HOURLY_URL)}">${esc(c.packages.hourlyLink)}</a> · <a href="${esc(REPO_URL)}">${esc(c.research.link)}</a> · <a href="${esc(PORTFOLIO_URL)}">${esc(c.about.name)}</a></p>
    </main>`;
}

function fannarHtml() {
  const c = CONTENT.pt;
  const p = c.page;
  return `<main style="${hidden}">
      <h1>${esc(p.hero.title)}</h1>
      <p>${esc(p.hero.lead)}</p>
      <h2>${esc(p.method.title)}</h2>
      <p>${esc(p.method.lead)}</p>
      ${pairs(p.method.steps)}
      <p>${esc(p.method.floorBody)}</p>
      <h2>${esc(p.methods.title)}</h2>
      <p>${esc(p.methods.lead)}</p>
      ${pairs(p.methods.items.map(([n, t, b]) => [`${n}: ${t}`, b]))}
      <h2>${esc(p.cases.title)}</h2>
      <p>${esc(p.cases.lead)}</p>
      ${p.cases.items.map((k) => `<h3>${esc(k.title)}</h3><p>${esc(k.model)} · ${esc(k.data)}. ${esc(k.body)}</p><ul>${k.findings.map((f) => li(esc(f))).join('')}</ul>`).join('')}
      <h2>${esc(p.scope.title)}</h2>
      <p>${esc(p.scope.body)}</p>
      <p><a href="/">${esc(c.nav.home)}</a> · <a href="${esc(CONTACT_URL)}">${esc(c.cta.button)}</a> · <a href="${esc(REPO_URL)}">${esc(c.research.link)}</a></p>
    </main>`;
}

function markdown(locale) {
  const c = CONTENT[locale];
  const p = c.page;
  const lines = [c.hero.lead, '', `## ${c.services.title}`, ''];
  for (const [t, b] of c.services.items) lines.push(`- **${t}** ${b}`);
  lines.push('', `## ${c.packages.title}`, '');
  for (const pk of c.packages.items) lines.push(`- **${pk.name}** (${pk.duration}, ${priceText(locale, pk.id)}): ${pk.summary} ${pk.deliverables.join('; ')}.`);
  lines.push('', `## ${c.limits.title}`, '', c.limits.body, '', `## ${c.faq.title}`, '');
  for (const [q, a] of c.faq.items) lines.push(`- **${q}** ${a}`);
  lines.push('', `## ${p.meta.title} (${SITE_URL}${FANNAR_PATH})`, '', p.hero.lead, '', `### ${p.method.title}`, '', p.method.lead, '');
  for (const [t, b] of p.method.steps) lines.push(`- **${t}.** ${b}`);
  lines.push('', p.method.floorBody, '', `### ${p.methods.title}`, '', p.methods.lead, '');
  for (const [n, t, b] of p.methods.items) lines.push(`- **${n}: ${t}.** ${b}`);
  lines.push('', p.methods.note, '', `### ${p.cases.title}`, '', p.cases.lead, '');
  for (const k of p.cases.items) {
    lines.push(`#### ${k.title}`, '', `${k.model} · ${k.data}. ${k.body}`, '');
    for (const f of k.findings) lines.push(`- ${f}`);
    lines.push('');
  }
  lines.push(`### ${p.scope.title}`, '', p.scope.body, '');
  lines.push(`## Links`, '', `- [${c.cta.button}](${CONTACT_URL})`, `- [${c.packages.hourlyLink}](${HOURLY_URL})`, `- [${c.research.link}](${REPO_URL})`, `- [${c.about.name}](${PORTFOLIO_URL})`);
  return lines.join('\n');
}

export function fannarContent() {
  return {
    name: 'fannar-content',
    transformIndexHtml(html, ctx) {
      if (!isFannarPage(ctx.path)) return html;
      const page = ctx.path === '/fannar-metodo.html' ? fannarHtml() : homeHtml();
      return html.replace('<div id="root"></div>', `<div id="root">${page}</div>`);
    },
    generateBundle() {
      const llms = [
        `# Fannar — ${CONTENT.en.footer.tagline}`,
        '',
        `> ${CONTENT.en.meta.description}`,
        '',
        `Site: ${SITE_URL}/`,
        '',
        markdown('en'),
        '',
        '---',
        '',
        `# Fannar — ${CONTENT.pt.footer.tagline} (Português)`,
        '',
        markdown('pt'),
        '',
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: 'fannar/llms.txt', source: llms });
    },
  };
}
