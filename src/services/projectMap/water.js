import * as THREE from 'three';
import { rnd } from '../ocean/utils';

export function makeWaterParticles() {
  const count = 2200;
  const positions = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const paleAqua = new THREE.Color('#d2f2e9');
  const deepAqua = new THREE.Color('#77c6bd');
  const mutedAqua = new THREE.Color('#438e8c');

  /* fase de cada partícula só depende da posição-base (fixa) — pré-computada
     aqui para o loop de animação (2200 partículas/frame) não recalcular. */
  const wavePhaseA = new Float32Array(count), wavePhaseB = new Float32Array(count);
  const wavePhaseC = new Float32Array(count), wavePhaseD = new Float32Array(count);
  const wavePhaseE = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const offset = i * 3;
    const bx = rnd(-108, 108), by = rnd(-68, 68), bz = rnd(-0.2, 1.15);
    base[offset] = positions[offset] = bx;
    base[offset + 1] = positions[offset + 1] = by;
    base[offset + 2] = positions[offset + 2] = bz;
    const color = Math.random() > 0.86
      ? paleAqua
      : deepAqua.clone().lerp(mutedAqua, Math.random() * 0.72);
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;

    wavePhaseA[i] = i + by * 0.08;
    wavePhaseB[i] = bz * 2.1;
    wavePhaseC[i] = i * 0.7 + bx * 0.035;
    wavePhaseD[i] = i * 0.11;
    wavePhaseE[i] = bx * 0.03 + i * 0.06;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.24,
    vertexColors: true,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(geometry, material);
  particles.userData = { base, count, wavePhaseA, wavePhaseB, wavePhaseC, wavePhaseD, wavePhaseE };
  return particles;
}
