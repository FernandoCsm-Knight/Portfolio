import * as THREE from 'three';
import { rnd } from '../ocean/utils';
import { optimizeParticleGeometry } from '../ocean/particleBudget';
import { construirCoralOrganico } from '../ocean/creatureBuilders';

function buildCoralVariant(type, palette, scale, seed) {
  if (type === 'branch') {
    const built = construirCoralOrganico({
      base: palette.base,
      tip: palette.tip,
      branches: 5 + (seed % 3),
      segments: 12,
      crown: 3,
      height: 3.4,
      spread: 1.35,
      thick: 0.72,
    }, scale);
    const optimized = optimizeParticleGeometry(
      built.geo,
      new Float32Array(built.geo.attributes.position.array),
      { density: 52, minParticles: 34, importance: 1.08 },
    );
    return { ...optimized, sway: 1 };
  }

  const positions = [];
  const colors = [];
  const baseColor = new THREE.Color(palette.base);
  const tipColor = new THREE.Color(palette.tip);

  function put(x, y, z, progress) {
    const color = baseColor.clone().lerp(tipColor, THREE.MathUtils.clamp(progress, 0, 1));
    positions.push(x * scale, y * scale, z * scale);
    colors.push(color.r, color.g, color.b);
  }

  if (type === 'fan') {
    for (let branch = 0; branch < 9; branch++) {
      const side = branch / 8 - 0.5;
      for (let segment = 0; segment < 18; segment++) {
        const t = segment / 17;
        const x = side * 3.2 * t + Math.sin(t * 4.1 + branch) * 0.13;
        const y = t * (3.1 + Math.cos(branch) * 0.35);
        for (let q = 0; q < 2; q++) put(x + (q - 0.5) * 0.11, y, side * 0.4, t);
        if (segment % 3 === 0 && branch < 8) {
          put(x + 0.2, y + 0.16, side * 0.38, t * 0.9);
          put(x - 0.2, y - 0.12, side * 0.38, t * 0.9);
        }
      }
    }
  } else if (type === 'tube') {
    for (let tube = 0; tube < 6; tube++) {
      const tx = (tube - 2.5) * 0.48 + Math.sin(tube * 2.1) * 0.12;
      const height = 1.7 + (tube % 3) * 0.42;
      for (let segment = 0; segment < 13; segment++) {
        const t = segment / 12;
        const radius = 0.23 - t * 0.055;
        for (let q = 0; q < 5; q++) {
          const angle = (q / 5) * Math.PI * 2;
          put(tx + Math.cos(angle) * radius, t * height, Math.sin(angle) * radius, t);
        }
      }
      for (let q = 0; q < 10; q++) {
        const angle = (q / 10) * Math.PI * 2;
        put(tx + Math.cos(angle) * 0.28, height, Math.sin(angle) * 0.28, 1);
      }
    }
  } else if (type === 'plate') {
    for (let layer = 0; layer < 4; layer++) {
      const cy = layer * 0.5;
      const radius = 1.35 - layer * 0.19;
      for (let p = 0; p < 52; p++) {
        const angle = rnd(0, Math.PI * 2);
        const r = Math.sqrt(Math.random()) * radius;
        put(Math.cos(angle) * r + layer * 0.12, cy + Math.sin(r * 3.4) * 0.08, Math.sin(angle) * r * 0.42, layer / 3);
      }
    }
  } else {
    for (let tentacle = 0; tentacle < 13; tentacle++) {
      const angle = (tentacle / 13) * Math.PI * 2;
      for (let segment = 0; segment < 15; segment++) {
        const t = segment / 14;
        const lean = 0.35 + (tentacle % 4) * 0.09;
        const x = Math.cos(angle) * (0.18 + t * lean) + Math.sin(t * 4 + tentacle) * 0.09;
        const y = t * (1.65 + (tentacle % 3) * 0.2);
        const z = Math.sin(angle) * (0.18 + t * lean);
        put(x, y, z, t);
        if (segment > 11) put(x + rnd(-0.08, 0.08), y, z + rnd(-0.08, 0.08), 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
  const optimized = optimizeParticleGeometry(
    geometry,
    new Float32Array(positions),
    { density: 50, minParticles: 30, importance: type === 'fan' ? 1.12 : 1 },
  );
  return {
    ...optimized,
    sway: type === 'plate' ? 0.18 : type === 'tube' ? 0.42 : type === 'fan' ? 0.72 : 1.08,
  };
}

export function makeReefRegion(terrain, project, index) {
  const group = new THREE.Group();
  const reefPalettes = [
    [{ base: '#1f625c', tip: '#8ff0d9' }, { base: '#315c52', tip: '#d4e8ae' }, { base: '#24576a', tip: '#78d8df' }],
    [{ base: '#603d62', tip: '#f1a7d0' }, { base: '#70484d', tip: '#f2b38f' }, { base: '#384f78', tip: '#b9b5f2' }],
    [{ base: '#74442f', tip: '#ffb66e' }, { base: '#76572d', tip: '#f2d47e' }, { base: '#6e3437', tip: '#f48c86' }],
    [{ base: '#294f78', tip: '#8dc9ff' }, { base: '#4c4278', tip: '#c1a8f2' }, { base: '#215f65', tip: '#85e2d3' }],
    [{ base: '#8b3049', tip: '#ff769d' }, { base: '#7c5620', tip: '#ffe15f' }, { base: '#326b35', tip: '#9bea72' }],
  ];
  const palettes = reefPalettes.flat();
  const types = ['branch', 'fan', 'tube', 'plate', 'anemone'];
  const placements = [];
  let placementAttempts = 0;
  while (placements.length < 64 && placementAttempts < 5000) {
    placementAttempts++;
    const x = rnd(-44, 44);
    const y = rnd(-23, 23);
    const growth = terrain.userData.vegetationAt(x, y);
    if (growth < 0.035 || Math.random() > 0.18 + growth * 0.82) continue;
    if (Math.hypot(x - project.map.x, y - project.map.y) < 2.7) continue;
    const candidate = {
      x,
      y,
      growth,
      scale: rnd(0.25, 0.48) * (0.68 + growth * 0.72),
      type: types[(placements.length * 2 + index) % types.length],
      rotation: rnd(-0.16, 0.16),
    };
    const hasRoom = placements.every((placement) =>
      Math.hypot(candidate.x - placement.x, candidate.y - placement.y) >= 1.18 + (1 - growth) * 0.34,
    );
    if (hasRoom) placements.push(candidate);
  }

  /* todas as plantas do recife viram UMA geometria só (em vez de dezenas de
     THREE.Points separados) — rotação/posição estáticas de cada planta são
     "assadas" nos vértices na criação, e o balanço (que antes vinha do
     rotation.z do objeto) é rotacionado manualmente no loop de animação.
     Isso troca ~11 draw calls + reenvios de buffer por frame, por projeto,
     por só 1. */
  const plantPositions = [];
  const plantColors = [];
  const phaseSway1List = [];
  const ampSway1List = [];
  const phaseSway2List = [];
  const ampSway2List = [];
  const speedList = [];
  const rotCosList = [];
  const rotSinList = [];

  placements.forEach((placement, i) => {
    const corePalette = palettes[(i * 7 + index * 3) % palettes.length];
    const fringeBase = new THREE.Color(corePalette.base).lerp(new THREE.Color('#123f43'), 0.42);
    const fringeTip = new THREE.Color(corePalette.tip).lerp(new THREE.Color('#4f9688'), 0.38);
    const palette = {
      base: `#${fringeBase.lerp(new THREE.Color(corePalette.base), placement.growth).getHexString()}`,
      tip: `#${fringeTip.lerp(new THREE.Color(corePalette.tip), placement.growth).getHexString()}`,
    };
    const coralData = buildCoralVariant(placement.type, palette, placement.scale, index + i);
    const base = coralData.base;
    const srcColors = coralData.geometry.attributes.color.array;
    const phase = rnd(0, Math.PI * 2);
    const speed = rnd(0.62, 0.88);
    const sway = coralData.sway;
    const cosR = Math.cos(placement.rotation);
    const sinR = Math.sin(placement.rotation);
    /* opacidade por planta (0.74 * brightness, antes por-material) vira um
       multiplicador de cor — visualmente equivalente sob AdditiveBlending,
       já que a contribuição final é ~cor * opacidade em ambos os casos. */
    const colorScale = Math.min(1.2973, coralData.brightness) * (0.68 + placement.growth * 0.42);
    const n = base.length / 3;

    for (let k = 0, j = 0; k < n; k++, j += 3) {
      const bx = base[j], by = base[j + 1], bz = base[j + 2];
      const worldX = placement.x + (bx * cosR - by * sinR);
      const worldY = placement.y + (bx * sinR + by * cosR);
      plantPositions.push(worldX, worldY, terrain.userData.surfaceHeightAt(worldX, worldY) + 0.08 + bz);
      plantColors.push(srcColors[j] * colorScale, srcColors[j + 1] * colorScale, srcColors[j + 2] * colorScale);
      phaseSway1List.push(phase + by * 0.72);
      ampSway1List.push(by * 0.055 * sway);
      phaseSway2List.push(phase + bx);
      ampSway2List.push(by * 0.006 * sway);
      speedList.push(speed);
      rotCosList.push(cosR);
      rotSinList.push(sinR);
    }
  });

  const plantBase = new Float32Array(plantPositions);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(plantPositions), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(plantColors), 3));
  const plants = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }));
  plants.userData = {
    base: plantBase,
    phaseSway1: new Float32Array(phaseSway1List),
    ampSway1: new Float32Array(ampSway1List),
    phaseSway2: new Float32Array(phaseSway2List),
    ampSway2: new Float32Array(ampSway2List),
    speed: new Float32Array(speedList),
    rotCos: new Float32Array(rotCosList),
    rotSin: new Float32Array(rotSinList),
  };
  group.add(plants);

  return group;
}
