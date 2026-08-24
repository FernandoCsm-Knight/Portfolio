// profundidade total simulada (unidades de mundo) e largura de dispersão das criaturas
export const PROF = 150;
export const LARG = 62;

// profundidade exibida no HUD quando a rolagem chega ao fim (prof normalizada = 1)
export const PROFUNDIDADE_MAX_M = 1500;

// paradas de cor por profundidade normalizada (0 = superfície, 1 = leito oceânico)
export const DEPTH_STOPS = [
  [0.0, '#1f6e72'],
  [0.18, '#15536a'],
  [0.38, '#0d3a55'],
  [0.62, '#07243d'],
  [0.84, '#031325'],
  [1.0, '#01070f'],
];
