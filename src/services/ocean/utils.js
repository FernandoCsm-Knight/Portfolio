export function rnd(a, b) {
  return a + Math.random() * (b - a);
}

export function nomeZona(t) {
  if (t < 0.28) return 'SUPERFÍCIE · EPIPELÁGICA';
  if (t < 0.66) return 'CREPÚSCULO · MESOPELÁGICA';
  return 'ABISMO · BATIPELÁGICA';
}
