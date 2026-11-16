import { Analytics } from '@vercel/analytics/react';
import { useEffect, useState } from 'react';
import { FaBook, FaGithub } from 'react-icons/fa6';
import {
  LuArrowRight,
  LuArrowUpRight,
  LuCheck,
  LuCircleAlert,
  LuCircleCheck,
  LuClock,
  LuEye,
  LuGitCompareArrows,
  LuLayers,
  LuMenu,
  LuRoute,
  LuScale,
  LuScanEye,
  LuSplit,
  LuTriangleAlert,
  LuX,
} from 'react-icons/lu';
import DriftEdge from './components/DriftEdge';
import GramFigure from './components/GramFigure';
import SnowDrift from './components/SnowDrift';
import { CONTACT_URL, HOURLY_URL, PACKAGE_PRICES, PORTFOLIO_URL, PRICE_CURRENCY, REPO_URL } from './config';
import { figureSrc, ROUTES } from './routes';
import { CONTENT, LOCALES } from './content';
import { briefConfigured, choosePackage, cooldownLeft, LIMITS, markSent, PACKAGE_EVENT, sendBrief } from './brief';
import { FIGURE_SIZES } from './content-fannar';
import { useI18n } from './i18n';

/* Um ícone por pergunta de content.services.items, na mesma ordem. */
const SERVICE_ICONS = [LuLayers, LuTriangleAlert, LuSplit, LuScanEye, LuRoute, LuGitCompareArrows];
const WHY_ICONS = [LuScale, LuTriangleAlert, LuGitCompareArrows];
const REPORT_ICONS = { ok: LuCircleCheck, warn: LuCircleAlert, info: LuEye };
/* Mesmas cores das figuras (Fannar-Showcase/showcase/common.py). */
const METHOD_TONES = ['fannar', 'shap', 'lime'];

function formatPrice(amount, currency, localeTag) {
  try {
    return new Intl.NumberFormat(localeTag, {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function Logo() {
  /* Marca: uma matriz 3×3 com diagonal e um bloco destacados — a Gram em
     miniatura. */
  const on = new Set(['0-0', '1-1', '2-2', '0-1', '1-0']);
  return (
    <a className="logo" href={ROUTES.home} aria-label="Fannar">
      <svg viewBox="0 0 22 22" aria-hidden="true">
        {[0, 1, 2].map((i) => [0, 1, 2].map((j) => (
          <rect key={`${i}-${j}`} x={j * 7.5} y={i * 7.5} width="6.5" height="6.5" rx="1.4"
            className={on.has(`${i}-${j}`) ? 'logo-on' : 'logo-off'} />
        )))}
      </svg>
      <span>Fannar</span>
    </a>
  );
}

function LanguageSwitch() {
  const { locale, setLocale, c } = useI18n();
  return (
    <div className="lang" role="group" aria-label={c.language}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={code === locale ? 'active' : ''}
          aria-pressed={code === locale}
          onClick={() => setLocale(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Header({ page }) {
  const { c } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /* Na página inicial as âncoras rolam a página; na do Fannar, voltam ao
     início já na seção certa. */
  const home = page === 'home' ? '' : ROUTES.home;
  const links = [
    [`${home}#servicos`, c.nav.services],
    [ROUTES.metodo, c.nav.fannar, page === 'fannar'],
    [ROUTES.docs, c.nav.docs],
    [`${home}#pacotes`, c.nav.packages],
    [`${home}#processo`, c.nav.process],
    [`${home}#duvidas`, c.nav.faq],
  ];

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}${open ? ' open' : ''}`}>
      <div className="container header-inner">
        <Logo />
        <nav id="site-nav" className="site-nav" aria-label="Fannar">
          {links.map(([href, label, current]) => (
            <a key={href} href={href} aria-current={current ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</a>
          ))}
          <a className="nav-contact" href="#demanda" onClick={() => setOpen(false)}>{c.nav.contact}</a>
        </nav>
        <div className="header-actions">
          <LanguageSwitch />
          <a className="btn btn-primary btn-sm header-cta" href="#demanda">{c.nav.contact}</a>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="site-nav"
            aria-label={open ? c.nav.close : c.nav.menu}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <LuX aria-hidden="true" /> : <LuMenu aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}

function SectionHead({ title, lead, center }) {
  return (
    <div className={`section-head${center ? ' center' : ''}`}>
      <h2>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

function Price({ id }) {
  const { c, locale } = useI18n();
  const currency = PRICE_CURRENCY[locale] ?? 'USD';
  const amount = PACKAGE_PRICES[id]?.[currency];
  if (amount == null) return <p className="price"><strong className="on-request">{c.packages.onRequest}</strong></p>;
  return (
    <p className="price">
      <span>{c.packages.priceFrom}</span>
      <strong>{formatPrice(amount, currency, c.localeTag)}</strong>
    </p>
  );
}

/* Formulário de demanda. Grava pela rota do portfólio (src/brief.js); o pedido
   de orçamento para um modelo específico continua indo para a página de contato. */
function BriefForm() {
  const { c } = useI18n();
  const b = c.brief;
  const [pack, setPack] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');

  useEffect(() => {
    const onChoose = (e) => setPack(e.detail || '');
    window.addEventListener(PACKAGE_EVENT, onChoose);
    return () => window.removeEventListener(PACKAGE_EVENT, onChoose);
  }, []);

  if (!briefConfigured) {
    return (
      <div className="brief-form brief-done">
        <p>{b.unavailable}</p>
        <a className="btn btn-primary" href={CONTACT_URL}>{b.contactLink}<LuArrowUpRight aria-hidden="true" /></a>
      </div>
    );
  }

  if (state === 'sent') {
    return (
      <div className="brief-form brief-done" role="status">
        <LuCircleCheck className="brief-done-icon" aria-hidden="true" />
        <h3>{b.sentTitle}</h3>
        <p>{b.sentBody}</p>
        <button type="button" className="btn btn-outline" onClick={() => setState('idle')}>{b.another}</button>
      </div>
    );
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (state === 'sending') return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get('website')) return; // armadilha para robôs
    const get = (k) => String(data.get(k) || '').trim();
    const text = get('message');
    if (text.length < LIMITS.message[0]) { setError(b.short); return; }
    const wait = cooldownLeft();
    if (wait > 0) { setError(b.wait.replace('{s}', wait)); return; }

    /* Cabeçalho em português para a caixa de entrada, qualquer que seja o
       idioma da página. */
    const pt = CONTENT.pt;
    const packName = pt.packages.items.find((p) => p.id === get('package'))?.name ?? pt.brief.packageUnsure;
    const modelName = pt.brief.models.find(([id]) => id === get('model'))?.[1] ?? pt.brief.models.at(-1)[1];
    const message = `[Fannar] Pacote: ${packName} · Modelo: ${modelName} · Idioma: ${c.localeTag}\n\n${text}`;

    setState('sending');
    setError('');
    try {
      await sendBrief({ name: get('name'), email: get('email'), company: get('company'), message });
      markSent();
      form.reset();
      setPack('');
      setState('sent');
    } catch {
      setError(b.failed);
      setState('idle');
    }
  }

  return (
    <form className="brief-form" onSubmit={onSubmit} noValidate={false}>
      <div className="field-row">
        <label className="field">
          <span>{b.name}</span>
          <input name="name" required minLength={LIMITS.name[0]} maxLength={LIMITS.name[1]} autoComplete="name" />
        </label>
        <label className="field">
          <span>{b.email}</span>
          <input name="email" type="email" required maxLength={LIMITS.email} autoComplete="email" />
        </label>
      </div>
      <label className="field">
        <span>{b.company}</span>
        <input name="company" maxLength={LIMITS.company} autoComplete="organization" />
      </label>
      <div className="field-row">
        <label className="field">
          <span>{b.package}</span>
          <select name="package" value={pack} onChange={(e) => setPack(e.target.value)}>
            <option value="">{b.packageUnsure}</option>
            {c.packages.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{b.model}</span>
          <select name="model" defaultValue="outro">
            {b.models.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </div>
      <label className="field">
        <span>{b.message}</span>
        <textarea name="message" rows={5} required minLength={LIMITS.message[0]} maxLength={LIMITS.message[1]}
          placeholder={b.placeholder} />
      </label>
      <label className="honeypot" aria-hidden="true">
        website <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {error && <p className="brief-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary btn-block" disabled={state === 'sending'}>
        {state === 'sending' ? b.sending : c.cta.button}
        {state !== 'sending' && <LuArrowRight aria-hidden="true" />}
      </button>
      <p className="brief-privacy">{b.privacy}</p>
    </form>
  );
}

function Cta() {
  const { c } = useI18n();
  const b = c.brief;
  return (
    <section id="demanda" className="cta">
      <div className="container">
        <div className="cta-inner cta-brief">
          <SnowDrift variant="dark" driftRatio={0.45} maxDrift={120} />
          <div className="cta-copy">
            <h2>{c.cta.title}</h2>
            <p>{c.cta.body}</p>
            <div className="quote-box">
              <h3>{b.quoteTitle}</h3>
              <p>{b.quoteBody}</p>
              <a className="btn btn-light" href={CONTACT_URL}>
                {b.quoteButton}
                <LuArrowUpRight aria-hidden="true" />
              </a>
            </div>
          </div>
          <BriefForm />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { c } = useI18n();
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Logo />
          <p>{c.footer.tagline}</p>
        </div>
        <nav aria-label="Links">
          <a href={ROUTES.metodo}>{c.footer.fannar}</a>
          <a href={ROUTES.docs}>{c.footer.docs}</a>
          <a href={PORTFOLIO_URL}>{c.footer.portfolio}</a>
          <a href={HOURLY_URL}>{c.footer.pricing}</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">{c.footer.code}</a>
        </nav>
        <p className="copyright">© {new Date().getFullYear()} Fernando Dal&apos; Maria</p>
      </div>
    </footer>
  );
}

/* Figura de um caso, no idioma atual; o clique abre em tamanho real. */
function CaseFigure({ name, alt, large }) {
  const { locale, c } = useI18n();
  const [w, h] = FIGURE_SIZES[name];
  const src = figureSrc(locale, name);
  return (
    <figure className={`case-figure${large ? ' large' : ''}`}>
      <a href={src} target="_blank" rel="noopener" title={c.page.cases.open}>
        <img src={src} alt={alt} width={w} height={h} loading="lazy" decoding="async" />
      </a>
    </figure>
  );
}

/* ===================== página inicial ===================== */

function ReportCard() {
  const { c } = useI18n();
  const r = c.hero.report;
  return (
    <div className="report-card">
      <p className="report-label">{r.label}</p>
      <h2 className="report-title">{r.title}</h2>
      <p className="report-model">{r.model}</p>
      <ul className="report-items">
        {r.items.map(([tone, text]) => {
          const Icon = REPORT_ICONS[tone];
          return (
            <li key={text} className={`tone-${tone}`}>
              <Icon aria-hidden="true" />
              <span>{text}</span>
            </li>
          );
        })}
      </ul>
      <a className="text-link" href={`${ROUTES.metodo}#churn`}>
        {r.link} <LuArrowRight aria-hidden="true" />
      </a>
    </div>
  );
}

function HomePage() {
  const { c, locale } = useI18n();
  const [w, h] = FIGURE_SIZES[c.showcase.image];
  return (
    <>
      {/* ===== HERO ===== */}
      <section id="top" className="hero">
        <SnowDrift variant="light" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>{c.hero.title}</h1>
            <p className="hero-lead">{c.hero.lead}</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#pacotes">
                {c.hero.primary}
                <LuArrowRight aria-hidden="true" />
              </a>
              <a className="btn btn-ghost" href={ROUTES.metodo}>{c.hero.secondary}</a>
            </div>
          </div>
          <div className="hero-figure">
            <ReportCard />
          </div>
        </div>
        <div className="container">
          <dl className="proof">
            {c.proof.map(([value, label]) => (
              <div key={label}>
                <dt>{value}</dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ===== POR QUE ===== */}
      <section className="section">
        <div className="container">
          <SectionHead title={c.why.title} />
          <div className="why-grid">
            {c.why.items.map(([title, body], i) => {
              const Icon = WHY_ICONS[i];
              return (
                <article key={title} className="why-item">
                  <span className="icon-badge"><Icon aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== SERVIÇOS ===== */}
      <section id="servicos" className="section section-subtle">
        <DriftEdge />
        <div className="container">
          <SectionHead title={c.services.title} lead={c.services.lead} />
          <div className="card-grid">
            {c.services.items.map(([title, body], i) => {
              const Icon = SERVICE_ICONS[i];
              return (
                <article key={title} className="card">
                  <span className="icon-badge"><Icon aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              );
            })}
          </div>
          <div className="models">
            <h3>{c.models.title}</h3>
            <ul>
              {c.models.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== VITRINE ===== */}
      <section className="section">
        <div className="container showcase">
          <div className="showcase-copy">
            <SectionHead title={c.showcase.title} lead={c.showcase.lead} />
            <ul className="showcase-list">
              {c.page.cases.items.map((item) => (
                <li key={item.id}>
                  <a href={`${ROUTES.metodo}#${item.id}`}>
                    <span>{item.title}</span>
                    <small>{item.model}</small>
                  </a>
                </li>
              ))}
            </ul>
            <a className="btn btn-primary" href={ROUTES.metodo}>
              {c.showcase.button}
              <LuArrowRight aria-hidden="true" />
            </a>
          </div>
          <a className="showcase-figure" href={`${ROUTES.metodo}#visao`}>
            <img src={figureSrc(locale, c.showcase.image)} alt={c.showcase.alt} width={w} height={h} loading="lazy" decoding="async" />
          </a>
        </div>
      </section>

      {/* ===== PACOTES ===== */}
      <section id="pacotes" className="section section-subtle">
        <DriftEdge />
        <div className="container">
          <SectionHead title={c.packages.title} lead={c.packages.lead} center />
          <div className="packages">
            {c.packages.items.map((pack) => (
              <article key={pack.id} className={`package${pack.featured ? ' featured' : ''}`}>
                {pack.featured && <span className="badge">{c.packages.popular}</span>}
                <h3>{pack.name}</h3>
                <p className="package-summary">{pack.summary}</p>
                <Price id={pack.id} />
                <ul className="checklist">
                  {pack.deliverables.map((item) => (
                    <li key={item}><LuCheck aria-hidden="true" /><span>{item}</span></li>
                  ))}
                </ul>
                <p className="duration">
                  <LuClock aria-hidden="true" />
                  <span>{c.packages.duration}: <strong>{pack.duration}</strong></span>
                </p>
                <a className={`btn ${pack.featured ? 'btn-primary' : 'btn-outline'} btn-block`} href="#demanda"
                  onClick={() => choosePackage(pack.id)}>
                  {c.packages.choose}
                </a>
              </article>
            ))}
          </div>
          <p className="hourly">
            {c.packages.hourly}{' '}
            <a href={HOURLY_URL}>{c.packages.hourlyLink}<LuArrowUpRight aria-hidden="true" /></a>
          </p>
        </div>
      </section>

      {/* ===== PROCESSO ===== */}
      <section id="processo" className="section">
        <div className="container">
          <SectionHead title={c.process.title} />
          <ol className="timeline">
            {c.process.steps.map(([title, body], i) => (
              <li key={title}>
                <span className="timeline-dot">{i + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== LIMITES, PESQUISA E AUTOR ===== */}
      <section className="section section-subtle">
        <DriftEdge />
        <div className="container trust-grid">
          <article className="card card-plain">
            <h3>{c.limits.title}</h3>
            <p>{c.limits.body}</p>
          </article>
          <article className="card card-plain">
            <h3>{c.research.title}</h3>
            <p>{c.research.body}</p>
            <div className="card-links">
              <a className="text-link" href={ROUTES.docs}>
                <FaBook aria-hidden="true" /> {c.research.docs}
              </a>
              <a className="text-link" href={REPO_URL} target="_blank" rel="noreferrer">
                <FaGithub aria-hidden="true" /> {c.research.link}
              </a>
            </div>
          </article>
          <article className="card card-plain about">
            <h3>{c.about.name}</h3>
            <p className="about-role">{c.about.role}</p>
            <p>{c.about.body}</p>
            <a className="text-link" href={PORTFOLIO_URL}>
              {c.about.link} <LuArrowUpRight aria-hidden="true" />
            </a>
          </article>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="duvidas" className="section">
        <div className="container faq-grid">
          <SectionHead title={c.faq.title} />
          <div className="faq">
            {c.faq.items.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Cta />
    </>
  );
}

/* ===================== página do Fannar ===================== */

function Case({ item, labels }) {
  const [main, ...rest] = item.figures;
  return (
    <article id={item.id} className="case">
      <div className="case-head">
        <div className="case-intro">
          <dl className="case-tags">
            <div><dt>{labels.model}</dt><dd>{item.model}</dd></div>
            <div><dt>{labels.data}</dt><dd>{item.data}</dd></div>
          </dl>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </div>
        <div className="case-findings">
          <ul className="checklist">
            {item.findings.map((text) => (
              <li key={text}><LuCheck aria-hidden="true" /><span>{text}</span></li>
            ))}
          </ul>
          {item.only && (
            <p className="case-only">
              <span className="badge-inline">{labels.only}</span>
              {item.only}
            </p>
          )}
        </div>
      </div>
      <CaseFigure name={main[0]} alt={main[1]} large />
      {rest.length > 0 && (
        <div className={`case-gallery${rest.length === 1 ? ' single' : ''}`}>
          {rest.map(([name, alt]) => <CaseFigure key={name} name={name} alt={alt} />)}
        </div>
      )}
    </article>
  );
}

function FannarPage() {
  const { c } = useI18n();
  const p = c.page;
  return (
    <>
      {/* ===== HERO ===== */}
      <section id="top" className="hero hero-page">
        <SnowDrift variant="light" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>{p.hero.title}</h1>
            <p className="hero-lead">{p.hero.lead}</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#casos">
                {p.hero.primary}
                <LuArrowRight aria-hidden="true" />
              </a>
              <a className="btn btn-ghost" href="#como-funciona">{p.hero.secondary}</a>
            </div>
          </div>
          <div className="hero-figure">
            <GramFigure
              title={p.hero.figureTitle}
              sources={p.hero.figureSources}
              result={p.hero.figureResult}
              caption={p.hero.figureCaption}
            />
          </div>
        </div>
      </section>

      {/* ===== MÉTODO ===== */}
      <section id="como-funciona" className="section">
        <div className="container">
          <SectionHead title={p.method.title} lead={p.method.lead} />
          <div className="formula" aria-label="G = T(T1(K1) ∘ T2(K2) ∘ … ∘ Td(Kd))">
            G = T( T<sub>1</sub>(K<sub>1</sub>) ∘ T<sub>2</sub>(K<sub>2</sub>) ∘ … ∘ T<sub>d</sub>(K<sub>d</sub>) )
          </div>
          <ol className="steps">
            {p.method.steps.map(([title, body], i) => (
              <li key={title}>
                <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
          <aside className="callout">
            <h3>{p.method.floorTitle}</h3>
            <p>{p.method.floorBody}</p>
          </aside>
        </div>
      </section>

      {/* ===== TRÊS MÉTODOS ===== */}
      <section id="metodos" className="section section-subtle">
        <DriftEdge />
        <div className="container">
          <SectionHead title={p.methods.title} lead={p.methods.lead} />
          <div className="method-grid">
            {p.methods.items.map(([name, title, body], i) => (
              <article key={name} className={`card method-card tone-${METHOD_TONES[i]}`}>
                <p className="method-name">{name}</p>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <p className="method-note">{p.methods.note}</p>
        </div>
      </section>

      {/* ===== CASOS ===== */}
      <section id="casos" className="section">
        <div className="container">
          <SectionHead title={p.cases.title} lead={p.cases.lead} />
          <nav className="case-nav" aria-label={p.cases.title}>
            {p.cases.items.map((item) => (
              <a key={item.id} href={`#${item.id}`}>{item.model}</a>
            ))}
          </nav>
          <div className="cases">
            {p.cases.items.map((item) => <Case key={item.id} item={item} labels={p.cases} />)}
          </div>
        </div>
      </section>

      {/* ===== ESCOPO E PESQUISA ===== */}
      <section className="section section-subtle">
        <DriftEdge />
        <div className="container trust-grid trust-grid-2">
          <article className="card card-plain">
            <h3>{p.scope.title}</h3>
            <p>{p.scope.body}</p>
          </article>
          <article className="card card-plain">
            <h3>{c.research.title}</h3>
            <p>{c.research.body}</p>
            <div className="card-links">
              <a className="text-link" href={ROUTES.docs}>
                <FaBook aria-hidden="true" /> {c.research.docs}
              </a>
              <a className="text-link" href={REPO_URL} target="_blank" rel="noreferrer">
                <FaGithub aria-hidden="true" /> {c.research.link}
              </a>
            </div>
          </article>
        </div>
      </section>

      <Cta />
    </>
  );
}

export default function App({ page }) {
  return (
    <>
      <Analytics />
      <a className="skip" href="#conteudo">↓</a>
      <Header page={page} />
      <main id="conteudo">
        {page === 'fannar' ? <FannarPage /> : <HomePage />}
      </main>
      <Footer />
    </>
  );
}
