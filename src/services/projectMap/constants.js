/* Rotas de patrulha das criaturas do mapa. Valores puros, sem dependências —
   ficam isolados para as fábricas de cena poderem ser lidas sem o ruído das
   tabelas de coordenadas. */
export const SHARK_PATROLS = [
  { cx: 36, cy: 18, rx: 4.1, ry: 2.1, speed: 0.18, phase: 0.4, wave: 0.7, scale: 0.66 },
  { cx: 35, cy: 18.6, rx: 3.2, ry: 2.8, speed: -0.13, phase: 2.3, wave: 1.1, scale: 0.53 },
  { cx: 37, cy: 17.2, rx: 2.7, ry: 1.7, speed: 0.24, phase: 4.6, wave: 1.5, scale: 0.49 },
  /* patrulha transferida da rosa dos ventos para baixo da corrente, a leste */
  { cx: 38, cy: -20, rx: 3.8, ry: 1.9, speed: -0.2, phase: 2.1, wave: 0.8, scale: 0.6 },
  { cx: 37, cy: -19.4, rx: 2.9, ry: 2.5, speed: 0.15, phase: 4.2, wave: 1.3, scale: 0.48 },
  { cx: 39, cy: -20.8, rx: 2.5, ry: 1.6, speed: -0.26, phase: 0.7, wave: 1.7, scale: 0.45 },
];
export const WHALE_PATROLS = [
  { cx: 36, cy: -1.2, rx: 5.2, ry: 1.75, speed: 0.042, phase: 4.4, scale: 0.44 },
  { cx: 38.2, cy: 0.7, rx: 4.6, ry: 2.15, speed: 0.047, phase: 4.92, scale: 0.34 },
];
