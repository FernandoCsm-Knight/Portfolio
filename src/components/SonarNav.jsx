import { memo, useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import { GiAnchor, GiPeriscope, GiRadarSweep, GiSubmarine, GiTreasureMap } from 'react-icons/gi';
import { NAV_ITEMS } from '../data/navItems';
import { useSonarNav } from '../hooks/useSonarNav';

const CX = 240, CY = 240, R_ITEM = 150, R_BLIP = 196;
const ICONES = {
  '#inicio': GiSubmarine,
  '#sobre': GiPeriscope,
  'projetos': GiTreasureMap,
  '#contato': GiAnchor,
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
const BLIPS = NAV_ITEMS.map((item) => {
  const angulo = (item.ang * Math.PI) / 180;
  return {
    href: item.href,
    rot: item.rot,
    cx: CX + Math.cos(angulo) * R_BLIP,
    cy: CY + Math.sin(angulo) * R_BLIP,
  };
});

function SonarNav() {
  const { open, activeHref, abertoPorProximidade, alternarPeloBotao, fechar } = useSonarNav(NAV_ITEMS);

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

  const activeBlip = BLIPS.find((blip) => blip.href === activeHref) ?? BLIPS[0];

  return (
    <>
      <nav
        id="sonar"
        className={open ? 'aberto' : ''}
        aria-label="Navegação"
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
              <stop offset="0%" stopColor="rgba(127,227,208,0)" />
              <stop offset="100%" stopColor="rgba(127,227,208,.55)" />
            </linearGradient>
          </defs>
          <circle cx="240" cy="240" r="196" fill="url(#marFundo)" />
          <circle cx="240" cy="240" r="196" fill="none" stroke="#c69749" strokeWidth="1.6" strokeOpacity=".6" />
          <circle cx="240" cy="240" r="214" fill="none" stroke="#c69749" strokeWidth=".6" strokeOpacity=".22" strokeDasharray="2 9" />
          <circle cx="240" cy="240" r="132" fill="none" stroke="#7fe3d0" strokeWidth=".6" strokeOpacity=".2" strokeDasharray="3 8" />
          <circle cx="240" cy="240" r="66" fill="none" stroke="#7fe3d0" strokeWidth=".5" strokeOpacity=".16" />
          <g>
            {TICKS.map((tk) => (
              <line
                key={tk.key}
                x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2}
                stroke="#c69749" strokeWidth={tk.strokeWidth} strokeOpacity={tk.strokeOpacity}
              />
            ))}
          </g>
          <g className="varredura">
            <path d="M240 240 L436 240 A196 196 0 0 0 407 138 Z" fill="url(#feixe)" opacity=".16" />
            <line x1="240" y1="240" x2="436" y2="240" stroke="#7fe3d0" strokeWidth="1" strokeOpacity=".5" />
          </g>
          <g>
            {BLIPS.map((b) => {
              const ativa = activeHref === b.href;
              return (
                <g key={b.href} className={ativa ? 'blip detectado' : 'blip'}>
                  <circle cx={b.cx} cy={b.cy} r={ativa ? 6 : 3.4} fill={ativa ? '#e7d3a8' : '#7fe3d0'} />
                  {ativa && (
                    <>
                      <circle cx={b.cx} cy={b.cy} r="15" fill="none" stroke="#e7d3a8" strokeWidth="1" />
                      <circle cx={b.cx} cy={b.cy} r="25" fill="none" stroke="#7fe3d0" strokeWidth=".7" strokeOpacity=".45" />
                    </>
                  )}
                </g>
              );
            })}
          </g>
          {activeBlip && (
            <g className="alvo-detectado">
              <line x1="240" y1="240" x2={activeBlip.cx} y2={activeBlip.cy} stroke="#e7d3a8" strokeWidth=".8" strokeOpacity=".58" strokeDasharray="4 8" />
              <text x="240" y="217" textAnchor="middle">ALVO IDENTIFICADO</text>
              <text x="240" y="263" textAnchor="middle" className="alvo-nome">{activeBlip.rot}</text>
            </g>
          )}
          <circle cx="240" cy="240" r="4" fill="#e7d3a8" />
        </svg>
        {NAV_ITEMS.map((it, i) => {
          const a = (it.ang * Math.PI) / 180;
          const ativa = activeHref === it.href;
          const Icone = ICONES[it.href] ?? GiRadarSweep;
          return (
            <a
              key={it.href}
              className={`item${ativa ? ' ativa' : ''}`}
              href={it.href}
              style={{
                left: `${(CX + Math.cos(a) * R_ITEM) / 4.8}%`,
                top: `${(CY + Math.sin(a) * R_ITEM) / 4.8}%`,
                '--atraso': `${i * 0.05}s`,
              }}
              onClick={fecharAposNavegar}
              aria-label={it.rot}
              title={it.rot}
            >
              <Icone aria-hidden="true" />
              <span>{it.rot}</span>
            </a>
          );
        })}
      </nav>
      <button
        id="btn-sonar"
        className={ocultarBotao ? 'oculto' : ''}
        aria-label={open ? 'Fechar navegação' : 'Abrir navegação'}
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
