import * as THREE from 'three';

/** Coordenada central da fenda profunda para uma dada latitude do mapa. */
export function deepChannelCenterX(y) {
  return (y * 0.42 - 19 - Math.sin(y * 0.055) * 5) / 0.72;
}

/* fase/amplitude da ondulação do corpo do peixe só dependem da posição-base
   (fixa) — pré-computadas na criação para o loop de animação não recalcular
   abs/multiplicações por vértice a cada frame. */
export function precomputeFishWave(base, phase) {
  const n = base.length / 3;
  const wavePhaseY = new Float32Array(n);
  const waveAmpY = new Float32Array(n);
  const wavePhaseZ = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 3) {
    const bx = base[j];
    const cauda = bx < 0 ? -bx * 0.16 : 0;
    wavePhaseY[i] = phase + bx * 1.1;
    waveAmpY[i] = 0.05 + cauda;
    wavePhaseZ[i] = j * 0.13;
  }
  return { wavePhaseY, waveAmpY, wavePhaseZ };
}

export function makePoints(points, colors, size, opacity = 1, blending = THREE.AdditiveBlending) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
  if (colors) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
  const mat = new THREE.PointsMaterial({
    size,
    vertexColors: Boolean(colors),
    color: colors ? undefined : 0xe7d3a8,
    transparent: true,
    opacity,
    depthWrite: false,
    blending,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}
