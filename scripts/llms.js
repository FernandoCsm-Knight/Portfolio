/* Conteúdo legível por máquina: /llms.txt, /llms-full.txt e um HTML estático
   dentro do #root.

   O site é uma SPA — o servidor entrega um <div id="root"> vazio e o resto
   nasce no JavaScript. Crawlers de IA (GPTBot, ClaudeBot, PerplexityBot) em
   geral não executam JS, então sem isto enxergariam só as meta tags.

   Tudo sai das mesmas fontes que o React usa (translations.js, sobre.js,
   socialLinks.js e a tabela `projects`), montado no build: escrever esses
   arquivos à mão garantiria que, na primeira edição de um projeto no /admin,
   eles passassem a descrever outro portfólio. */
import { TRANSLATIONS } from '../src/i18n/translations.js'
import { PUBLICACOES } from '../src/data/sobre.js'
import { CV_LINKS } from '../src/data/socialLinks.js'

const SITE = 'https://fernandocsdm.com'
const NAME = "Fernando Campos Silva Dal' Maria"

/* REST direto em vez do cliente supabase-js: aqui é Node no build, sem sessão,
   e a leitura de `projects` já é pública pela RLS — é a mesma que o mapa faz
   no navegador. Falhar não derruba o build: sem rede ou sem variáveis, os
   arquivos saem sem a lista e apontam para /projects. */
async function fetchProjects(env) {
  const url = env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return []
  try {
    const response = await fetch(
      `${url}/rest/v1/projects?select=title_pt,title_en,description_pt,description_en,tags,href&order=position.asc`,
      { headers: { apikey: key }, signal: AbortSignal.timeout(8000) },
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    console.warn(`[llms] projetos não carregados (${error.message}); seguindo sem a lista.`)
    return []
  }
}

/* WhatsApp fica de fora de propósito: é número pessoal, e estes arquivos
   existem justamente para serem copiados em massa. */
function contactLinks(env) {
  return [
    ['E-mail', env.VITE_MAIL_URL],
    ['LinkedIn', env.VITE_LINKEDIN_URL || 'https://www.linkedin.com/in/fernandocsdm'],
    ['GitHub', env.VITE_GITHUB_URL || 'https://github.com/FernandoCsm-Knight'],
  ]
    .map(([label, href]) => [label, href?.trim()])
    .filter(([, href]) => href)
}

const pick = (row, field, locale) => row[`${field}_${locale}`] || row[`${field}_pt`] || ''

function markdownSection(locale, projects, contacts, { full }) {
  const t = TRANSLATIONS[locale]
  const labels = locale === 'pt'
    ? { areas: 'Áreas', projects: 'Projetos', contact: 'Contato', cv: 'Currículo', pages: 'Páginas' }
    : { areas: 'Areas', projects: 'Projects', contact: 'Contact', cv: 'Résumé', pages: 'Pages' }
  const lines = []

  lines.push(`${labels.areas}: ${t.hero.graphics}, ${t.hero.ai}, ${t.hero.performance}. ${t.about.location}.`, '')
  lines.push(t.about.summary, '')
  lines.push(`Skills: ${t.skills.join(', ')}`, '')

  if (full) {
    lines.push(`## ${t.about.trajectoryTitle}`, '')
    for (const [period, title, place, description] of t.about.trajectory) {
      lines.push(`- **${title}** — ${place} (${period}): ${description}`)
    }
    lines.push('', `## ${t.about.credentialsTitle}`, '')
    for (const credential of t.about.credentials) lines.push(`- ${credential}`)
    lines.push('')
  }

  lines.push(`## ${t.about.papersTitle}`, '')
  for (const paper of PUBLICACOES) {
    lines.push(`- [${paper.titulo}](${paper.href}): ${paper.veiculo}, DOI ${paper.doi}`)
  }

  lines.push('', `## ${labels.projects}`, '')
  if (projects.length) {
    for (const row of projects) {
      const title = pick(row, 'title', locale)
      const description = pick(row, 'description', locale)
      const tags = row.tags?.length ? ` (${row.tags.join(', ')})` : ''
      lines.push(row.href ? `- [${title}](${row.href}): ${description}${tags}` : `- ${title}: ${description}${tags}`)
    }
  } else {
    lines.push(`- [${t.projects.map}](${SITE}/projects)`)
  }

  lines.push('', `## ${labels.cv}`, '')
  for (const cv of CV_LINKS) lines.push(`- [${cv.title}](${SITE}${cv.href})`)

  lines.push('', `## ${labels.contact}`, '')
  for (const [label, href] of contacts) lines.push(`- ${label}: ${href.replace(/^mailto:/, '')}`)
  lines.push(`- [${t.contact.action}](${SITE}/contact)`)

  return lines.join('\n')
}

function pagesSection() {
  return [
    '## Pages',
    '',
    `- [Home](${SITE}/): overview, areas of expertise and visitor reviews`,
    `- [About](${SITE}/about): background, timeline, papers and certifications`,
    `- [Projects](${SITE}/projects): interactive map of published projects`,
    `- [Pricing](${SITE}/pricing): hourly rates by type of work, adjusted per region`,
    `- [Contact](${SITE}/contact): encrypted contact form for project requests`,
  ].join('\n')
}

/* /llms.txt segue a proposta de llmstxt.org: H1, citação-resumo e listas de
   links. Em inglês por ser o idioma em que mais agentes buscam; o
   llms-full.txt leva o conteúdo inteiro em inglês e em português. */
function buildLlmsTxt(projects, contacts) {
  return [
    `# ${NAME}`,
    '',
    `> ${TRANSLATIONS.en.about.role}`,
    '',
    markdownSection('en', projects, contacts, { full: false }),
    '',
    pagesSection(),
    '',
    '## Optional',
    '',
    `- [Full content (EN + PT)](${SITE}/llms-full.txt)`,
    '',
  ].join('\n')
}

function buildLlmsFullTxt(projects, contacts) {
  return [
    `# ${NAME}`,
    '',
    `> ${TRANSLATIONS.en.about.role}`,
    '',
    markdownSection('en', projects, contacts, { full: true }),
    '',
    pagesSection(),
    '',
    '---',
    '',
    `# ${NAME} (Português)`,
    '',
    `> ${TRANSLATIONS.pt.about.role}`,
    '',
    markdownSection('pt', projects, contacts, { full: true }),
    '',
  ].join('\n')
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

/* Fica dentro do #root: o createRoot().render() substitui tudo ao montar, então
   quem roda JS nunca vê este bloco, e quem não roda (crawler, leitor de texto)
   recebe o conteúdo em HTML semântico. Escondido como .sr-only e não com
   display:none — continua no fluxo de acessibilidade e não pisca sem estilo
   no milissegundo antes do React montar. */
function buildFallbackHtml(projects, contacts) {
  const t = TRANSLATIONS.pt
  const li = (html) => `<li>${html}</li>`
  const link = (href, text) => `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`

  const projectItems = projects.length
    ? projects.map((row) => {
        const title = row.href ? link(row.href, row.title_pt) : escapeHtml(row.title_pt)
        return li(`${title}: ${escapeHtml(row.description_pt ?? '')}`)
      })
    : [li(link('/projects', t.projects.map))]

  return `
      <main style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">
        <h1>${escapeHtml(NAME)}</h1>
        <p>${escapeHtml(t.about.role)}</p>
        <p>${escapeHtml(t.about.summary)}</p>
        <p>${escapeHtml(t.hero.areas)}: ${escapeHtml([t.hero.graphics, t.hero.ai, t.hero.performance].join(', '))}. ${escapeHtml(t.about.location)}.</p>
        <p>Habilidades: ${escapeHtml(t.skills.join(', '))}</p>
        <nav aria-label="${escapeHtml(t.nav.label)}"><ul>
          ${[['/about', 'Sobre'], ['/projects', 'Projetos'], ['/pricing', t.pricing.title], ['/contact', t.contact.title]].map(([href, text]) => li(link(href, text))).join('')}
        </ul></nav>
        <h2>${escapeHtml(t.about.trajectoryTitle)}</h2>
        <ul>${t.about.trajectory.map(([period, title, place, description]) => li(`<strong>${escapeHtml(title)}</strong> — ${escapeHtml(place)} (${escapeHtml(period)}): ${escapeHtml(description)}`)).join('')}</ul>
        <h2>${escapeHtml(t.about.papersTitle)}</h2>
        <ul>${PUBLICACOES.map((paper) => li(`${link(paper.href, paper.titulo)} — ${escapeHtml(paper.veiculo)}`)).join('')}</ul>
        <h2>${escapeHtml(t.about.credentialsTitle)}</h2>
        <ul>${t.about.credentials.map((credential) => li(escapeHtml(credential))).join('')}</ul>
        <h2>Projetos</h2>
        <ul>${projectItems.join('')}</ul>
        <h2>Currículo</h2>
        <ul>${CV_LINKS.map((cv) => li(link(cv.href, cv.title))).join('')}</ul>
        <h2>${escapeHtml(t.contact.title)}</h2>
        <ul>${contacts.map(([label, href]) => li(link(href, label))).join('')}${li(link('/contact', t.contact.action))}</ul>
      </main>
    `
}

export function llmsContent(env) {
  /* Uma busca por processo: no `vite dev` o transformIndexHtml roda a cada
     carregamento de página, e não há por que ir ao Supabase em todos. */
  let projectsPromise
  const loadProjects = () => (projectsPromise ??= fetchProjects(env))
  const contacts = contactLinks(env)

  return {
    name: 'llms-content',
    async transformIndexHtml(html) {
      const fallback = buildFallbackHtml(await loadProjects(), contacts)
      return html.replace('<div id="root"></div>', `<div id="root">${fallback}</div>`)
    },
    async generateBundle() {
      const projects = await loadProjects()
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: buildLlmsTxt(projects, contacts) })
      this.emitFile({ type: 'asset', fileName: 'llms-full.txt', source: buildLlmsFullTxt(projects, contacts) })
    },
  }
}
