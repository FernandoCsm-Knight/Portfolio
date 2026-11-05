import { useMemo } from 'react';

/* Ilustração do método no topo da página: três matrizes de Gram (uma por
   fonte) e o produto de Hadamard entre elas. Os valores são sintéticos, mas
   seguem a construção real: similaridade alta dentro da classe, ruído
   próprio de cada fonte, e o produto elemento a elemento apagando o que só
   uma fonte vê. Semente fixa, para o desenho não mudar a cada visita. */

const CLASSES = [0, 0, 0, 1, 1, 1, 2, 2];
const N = CLASSES.length;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/* Simétrica, diagonal 1, blocos por classe com ruído. */
function sourceMatrix(seed, within, across, noise) {
  const rand = rng(seed);
  const m = Array.from({ length: N }, () => Array(N).fill(0));
  for (let i = 0; i < N; i += 1) {
    m[i][i] = 1;
    for (let j = i + 1; j < N; j += 1) {
      const base = CLASSES[i] === CLASSES[j] ? within : across;
      const v = Math.min(1, Math.max(0.04, base + (rand() - 0.5) * noise));
      m[i][j] = v;
      m[j][i] = v;
    }
  }
  return m;
}

const SOURCES = [
  sourceMatrix(7, 0.78, 0.36, 0.5),
  sourceMatrix(19, 0.72, 0.3, 0.6),
  sourceMatrix(42, 0.8, 0.42, 0.45),
];

const PRODUCT = (() => {
  const g = SOURCES[0].map((row, i) => row.map((_, j) => SOURCES.reduce((acc, m) => acc * m[i][j], 1)));
  /* Normalização simples para usar a escala de cor inteira. */
  const off = g.flatMap((row, i) => row.filter((_, j) => j !== i));
  const max = Math.max(...off);
  return g.map((row, i) => row.map((v, j) => (i === j ? 1 : v / max)));
})();

/* Snow Storm (#ECEFF4) → Frost escuro: a mesma rampa da paleta Nord. */
function color(v) {
  const t = Math.pow(Math.min(1, Math.max(0, v)), 1.15);
  const from = [236, 239, 244];
  const to = [67, 95, 131];
  const mix = from.map((f, k) => Math.round(f + (to[k] - f) * t));
  return `rgb(${mix.join(',')})`;
}

function Matrix({ m, x, y, cell, gap = 1.5, radius = 1.5 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {m.map((row, i) =>
        row.map((v, j) => (
          <rect
            key={`${i}-${j}`}
            x={j * cell}
            y={i * cell}
            width={cell - gap}
            height={cell - gap}
            rx={radius}
            fill={color(v)}
          />
        )),
      )}
    </g>
  );
}

export default function GramFigure({ title, sources, result, caption }) {
  const small = 13;
  const big = 27;
  const smallSize = small * N;
  const bigSize = big * N;
  const width = 420;
  const op = 30;
  const rowWidth = smallSize * 3 + op * 2;
  const x0 = (width - rowWidth) / 2;
  const bigX = (width - bigSize) / 2;
  const bigY = smallSize + 82;

  const labels = useMemo(() => sources.map((label, k) => ({
    label,
    k,
    cx: x0 + k * (smallSize + op) + smallSize / 2,
  })), [sources, x0, smallSize]);

  return (
    <figure className="gram-figure">
      <figcaption className="gram-figure-title">{title}</figcaption>
      <svg viewBox={`0 0 ${width} ${bigY + bigSize + 34}`} role="img" aria-label={`${sources.join(' ∘ ')} = ${result}`}>
        {labels.map(({ label, k, cx }) => (
          <g key={label}>
            <Matrix m={SOURCES[k]} x={cx - smallSize / 2} y={8} cell={small} />
            <text x={cx} y={smallSize + 28} textAnchor="middle" className="gram-label">
              K<tspan baselineShift="sub" fontSize="9">{k + 1}</tspan> · {label}
            </text>
            {k < 2 && (
              <text x={cx + smallSize / 2 + op / 2} y={8 + smallSize / 2 + 7} textAnchor="middle" className="gram-op">∘</text>
            )}
          </g>
        ))}
        <path
          d={`M ${width / 2} ${smallSize + 42} v 24 m -6 -7 l 6 7 l 6 -7`}
          fill="none"
          className="gram-arrow"
        />
        <Matrix m={PRODUCT} x={bigX} y={bigY} cell={big} gap={2.5} radius={3} />
        <text x={width / 2} y={bigY + bigSize + 24} textAnchor="middle" className="gram-label gram-label-strong">
          {result}
        </text>
      </svg>
      <p className="gram-figure-caption">{caption}</p>
    </figure>
  );
}
