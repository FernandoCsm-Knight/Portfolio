import { memo, useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import { GiAnchor, GiPeriscope, GiRadarSweep, GiSubmarine, GiTreasureMap } from 'react-icons/gi';
import { NAV_ITEMS } from '../data/navItems';
import { useSonarNav } from '../hooks/useSonarNav';
import { useI18n } from '../i18n/context';

const CX = 240, CY = 240, R_ITEM = 140, R_ITEM_MOBILE = 196;
const ICONES = {
  '#inicio': GiSubmarine,
  'sobre': GiPeriscope,
  'projetos': GiTreasureMap,
  'contato': GiAnchor,
};

const TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * Math.PI * 2;
  const maior = i % 15 === 0;
  const meio = i % 5 === 0;
  const r2 = 196 - (maior ? 12 : meio ? 7 : 3.5);
  return {
    key: i,
    x1: CX + Math.cos(a) * 196,
    y1: CY + Math.sin(a) * 196,
    x2: CX + Math.cos(a) * r2,
    y2: CY + Math.sin(a) * r2,
    strokeWidth: maior ? 1.6 : meio ? 1 : 0.6,
    strokeOpacity: maior ? 0.7 : meio ? 0.42 : 0.22,
  };
});
function SonarNav({ route }) {
  const { t } = useI18n();
  const { open, activeHref, abertoPorProximidade, alternarPeloBotao, fechar } = useSonarNav(
    NAV_ITEMS,
    route,
  );

  /* Com o menu aberto pela aproximação do mouse, afastá-lo já fecha: o X fica
     no centro do sonar sem função. Some nesse caso — mas continua presente
     quando a abertura veio do botão (toque/teclado), onde é a única saída. */
  const ocultarBotao = open && abertoPorProximidade;

  /* o fechamento é adiado para a âncora terminar de "acender"; sem cancelar no
     unmount o timer sobrevive ao componente e dispara setState no vazio. */
  const timerFechar = useRef(null);
  useEffect(() => () => clearTimeout(timerFechar.current), []);
  function fecharAposNavegar() {
    clearTimeout(timerFechar.current);
    timerFechar.current = setTimeout(fechar, 350);
  }

  return (
    <>
      <nav
        id="sonar"
        className={open ? 'aberto' : ''}
        aria-label={t('nav.label')}
        aria-hidden={!open}
        inert={!open}
      >
        <svg viewBox="0 0 480 480" aria-hidden="true">
          <defs>
            <radialGradient id="marFundo" cx="42%" cy="38%" r="72%">
              <stop offset="0%" stopColor="#0d3a44" />
              <stop offset="55%" stopColor="#072330" />
              <stop offset="100%" stopColor="#03101c" />
            </radialGradient>
            <linearGradient id="feixe" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(56,189,227,0)" />
              <stop offset="100%" stopColor="rgba(56,189,227,.55)" />
            </linearGradient>
          </defs>
          <circle cx="240" cy="240" r="196" fill="url(#marFundo)" />
          <circle cx="240" cy="240" r="196" fill="none" stroke="#858e91" strokeWidth="1.6" strokeOpacity=".6" />
          <circle cx="240" cy="240" r="214" fill="none" stroke="#858e91" strokeWidth=".6" strokeOpacity=".22" strokeDasharray="2 9" />
          <circle cx="240" cy="240" r="132" fill="none" stroke="#38bde3" strokeWidth=".6" strokeOpacity=".2" strokeDasharray="3 8" />
          <circle cx="240" cy="240" r="66" fill="none" stroke="#38bde3" strokeWidth=".5" strokeOpacity=".16" />
          <g>
            {TICKS.map((tk) => (
              <line
                key={tk.key}
                x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2}
                stroke="#858e91" strokeWidth={tk.strokeWidth} strokeOpacity={tk.strokeOpacity}
              />
            ))}
          </g>
          <g className="varredura">
            <path d="M240 240 L436 240 A196 196 0 0 0 407 138 Z" fill="url(#feixe)" opacity=".16" />
            <line x1="240" y1="240" x2="436" y2="240" stroke="#38bde3" strokeWidth="1" strokeOpacity=".5" />
          </g>
          <circle cx="240" cy="240" r="4" fill="#aeb5b7" />
        </svg>
        {NAV_ITEMS.map((it, i) => {
          const a = (it.ang * Math.PI) / 180;
          const mobileAngle = ((200 + (140 * i) / Math.max(1, NAV_ITEMS.length - 1)) * Math.PI) / 180;
          const ativa = activeHref === it.href;
          const Icone = ICONES[it.href] ?? GiRadarSweep;
          const labelKey = { '#inicio': 'home', sobre: 'about', projetos: 'projects', contato: 'contact' }[it.href];
          const label = t(`nav.${labelKey}`);
          return (
            <a
              key={it.href}
              className={`item${ativa ? ' ativa' : ''}`}
              href={`/${it.href}`}
              style={{
                left: `${(CX + Math.cos(a) * R_ITEM) / 4.8}%`,
                top: `${(CY + Math.sin(a) * R_ITEM) / 4.8}%`,
                '--mobile-left': `${(CX + Math.cos(mobileAngle) * R_ITEM_MOBILE) / 4.8}%`,
                '--mobile-top': `${(CY + Math.sin(mobileAngle) * R_ITEM_MOBILE) / 4.8}%`,
                '--atraso': `${i * 0.05}s`,
              }}
              onClick={fecharAposNavegar}
              aria-label={label}
              title={label}
            >
              <Icone aria-hidden="true" />
              <span>{label}</span>
            </a>
          );
        })}
      </nav>
      <button
        id="btn-sonar"
        className={ocultarBotao ? 'oculto' : ''}
        aria-label={open ? t('nav.close') : t('nav.open')}
        aria-controls="sonar"
        aria-expanded={open}
        inert={ocultarBotao}
        onClick={alternarPeloBotao}
      >
        {open ? <FaTimes aria-hidden="true" /> : <GiRadarSweep aria-hidden="true" />}
      </button>
    </>
  );
}

export default memo(SonarNav);
