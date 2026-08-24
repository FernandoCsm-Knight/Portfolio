import * as THREE from 'three';
import { rnd } from '../ocean/utils';
import { optimizeParticleGeometry } from '../ocean/particleBudget';
import { construirPeixeOrganico } from '../ocean/creatureBuilders';
import { M_LANTERNA } from '../ocean/creatureConfigs';
import { precomputeFishWave } from './utils';

/* todos os peixes-lanterna viram 1 THREE.Points só, em vez de vários objetos
   separados — cada peixe nada com posição/direção próprias (inclusive
   um espelhamento em Y quando nada "de costas"), então esse transform que
   antes vinha do Object3D é assado por vértice no loop de animação. O
   tamanho do ponto (antes sorteado por peixe) vira um único valor
   compartilhado — a única diferença visual real dessa unificação, e bem
   sutil nesses peixes pequenos de fundo. */
export function makeDeepFishSchools(extraSchools = []) {
  const schools = [
    /* cardume dourado transferido da rosa dos ventos para baixo da corrente */
    { cx: 24, cy: -20, rx: 4.6, ry: 1.65, speed: 0.1, phase: 4.1, tint: '#ffc064' },
    ...extraSchools,
  ];
  const baseOpacity = 0.78;

  const baseList = [];
  const colorList = [];
  const wavePhaseYList = [];
  const waveAmpYList = [];
  const wavePhaseZList = [];
  const fishMeta = [];

  schools.forEach((school, schoolIndex) => {
    const fishCount = school.count ?? 6 + (schoolIndex % 2);
    for (let i = 0; i < fishCount; i++) {
      const built = construirPeixeOrganico(M_LANTERNA.organico, rnd(0.12, 0.17));
      const optimized = optimizeParticleGeometry(built.geo, built.base, {
        density: 86,
        minParticles: 24,
        importance: 0.92,
      });
      const base = optimized.base;
      const srcColors = optimized.geometry.attributes.color.array;
      const n = base.length / 3;
      const tint = new THREE.Color(school.tint ?? '#72c7ff');
      const tintMix = school.tintMix ?? 0.68;
      /* opacidade por peixe (antes por material) vira multiplicador de cor. */
      const colorScale = Math.min(1.08, rnd(0.72, 0.9) * optimized.brightness) / baseOpacity;
      const phase = rnd(0, Math.PI * 2);
      const wave = precomputeFishWave(base, phase);
      const start = baseList.length / 3;

      for (let k = 0, j = 0; k < n; k++, j += 3) {
        baseList.push(base[j], base[j + 1], base[j + 2]);
        const intensity = Math.max(srcColors[j], srcColors[j + 1], srcColors[j + 2]);
        const tintScale = 0.52 + intensity * 0.72;
        colorList.push(
          (srcColors[j] * (1 - tintMix) + tint.r * tintScale * tintMix) * colorScale,
          (srcColors[j + 1] * (1 - tintMix) + tint.g * tintScale * tintMix) * colorScale,
          (srcColors[j + 2] * (1 - tintMix) + tint.b * tintScale * tintMix) * colorScale,
        );
      }
      wavePhaseYList.push(...wave.wavePhaseY);
      waveAmpYList.push(...wave.waveAmpY);
      wavePhaseZList.push(...wave.wavePhaseZ);

      const scatterAngle = rnd(0, Math.PI * 2);
      const scatterRadius = Math.sqrt(Math.random()) * (school.spread ?? 0);
      fishMeta.push({
        school,
        phase,
        start,
        count: n,
        orbitOffset: rnd(-0.16, 0.16),
        offsetX: school.spread
          ? Math.cos(scatterAngle) * scatterRadius
          : -i * rnd(0.42, 0.68) + rnd(-0.2, 0.2),
        offsetY: school.spread
          ? Math.sin(scatterAngle) * scatterRadius * 0.72
          : (i % 2 ? 1 : -1) * rnd(0.18, 0.48),
      });
    }
  });

  const base = new Float32Array(baseList);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(base.length), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colorList), 3));
  const fishObj = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.145,
    vertexColors: true,
    transparent: true,
    opacity: baseOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }));

  return {
    fishObj,
    base,
    wavePhaseY: new Float32Array(wavePhaseYList),
    waveAmpY: new Float32Array(waveAmpYList),
    wavePhaseZ: new Float32Array(wavePhaseZList),
    fish: fishMeta,
  };
}

export function makeReefFish(terrain, projects) {
  const pointsPerFish = 3;
  const fishSites = [];

  /* Os peixes ocupam apenas a extensão natural do recife; nenhum cardume
     usa o marcador do projeto como centro de órbita. */
  let regionalFish = 0;
  let attempts = 0;
  while (projects.length && regionalFish < 56 && attempts < 5000) {
    attempts++;
    const x = rnd(-44, 44);
    const y = rnd(-23, 23);
    const growth = terrain.userData.vegetationAt(x, y);
    if (growth < 0.055 || Math.random() > 0.2 + growth * 0.8) continue;
    fishSites.push({
      centerX: x,
      centerY: y,
      radius: rnd(1.3, 3.7),
      verticalScale: rnd(0.48, 0.82),
      depth: terrain.userData.surfaceHeightAt(x, y) + rnd(1.15, 2.05),
    });
    regionalFish++;
  }

  const fishCount = fishSites.length;
  const positions = new Float32Array(fishCount * pointsPerFish * 3);
  const colors = new Float32Array(fishCount * pointsPerFish * 3);
  const fishMeta = [];
  const reefColors = [
    '#ffe08a', '#ff8f70', '#72e4cf', '#ff93c8',
    '#c5a5ff', '#72d8ff', '#ffb45f', '#f47c72',
    '#84e66f', '#e879df', '#58d6ee', '#ffd15c',
  ];

  fishSites.forEach((site, fishIndex) => {
    const bodyColor = new THREE.Color(reefColors[fishIndex % reefColors.length]);
    const headColor = bodyColor.clone().lerp(new THREE.Color('#ffffff'), 0.38);
    fishMeta.push({
      ...site,
      speed: rnd(0.11, 0.24) * (fishIndex % 4 === 0 ? -1 : 1),
      phase: rnd(0, Math.PI * 2),
      wobble: rnd(0.12, 0.38),
    });
    for (let q = 0; q < pointsPerFish; q++) {
      const offset = (fishIndex * pointsPerFish + q) * 3;
      const color = q === 2 ? headColor : bodyColor;
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const fish = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }));
  fish.userData = { fishMeta, pointsPerFish };
  return fish;
}
