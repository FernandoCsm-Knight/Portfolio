import * as THREE from 'three';
import { construirPeixeOrganico } from '../ocean/creatureBuilders';
import {
  M_BARRACUDA,
  M_CARPA,
  M_DOURADO,
  M_MACHADO,
  M_NEON,
  M_SALMAO,
} from '../ocean/creatureConfigs';

const SPECIES = [
  { model: M_CARPA, tint: '#f2d3a2', count: 14, scale: [0.15, 0.21], speed: [0.68, 1.05] },
  { model: M_DOURADO, tint: '#f1bf58', count: 18, scale: [0.14, 0.2], speed: [0.78, 1.18] },
  { model: M_NEON, tint: '#51d9ef', count: 22, scale: [0.14, 0.2], speed: [1.08, 1.6] },
  { model: M_SALMAO, tint: '#e5867d', count: 15, scale: [0.14, 0.2], speed: [0.72, 1.12] },
  { model: M_BARRACUDA, tint: '#8fc5d4', count: 15, scale: [0.12, 0.17], speed: [1.15, 1.72] },
  { model: M_MACHADO, tint: '#b29ae8', count: 19, scale: [0.16, 0.23], speed: [0.82, 1.28] },
];

const LOGO_AQUA = new THREE.Color('#7fe3d0');
const LOGO_GOLD = new THREE.Color('#c69749');
const LOGO_PALE_GOLD = new THREE.Color('#e7d3a8');

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function deterministicUnit(index, salt) {
  let value = Math.imul(index + 1 + salt * 1013, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

function logoColorAt(progress, depth) {
  const color = progress < 0.5
    ? LOGO_AQUA.clone().lerp(LOGO_PALE_GOLD, progress * 2)
    : LOGO_PALE_GOLD.clone().lerp(LOGO_GOLD, (progress - 0.5) * 2);
  return color.offsetHSL((depth - 0.5) * 0.025, 0, (depth - 0.5) * 0.08);
}

function makeLetterTargets(particleCount, centerZ) {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 960;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.font = "italic 700 900px 'Cormorant Garamond', serif";
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const metrics = context.measureText('f');
  const ascent = metrics.actualBoundingBoxAscent || 680;
  const descent = metrics.actualBoundingBoxDescent || 190;
  const baseline = canvas.height * 0.5 + (ascent - descent) * 0.5;
  context.fillText('f', canvas.width * 0.5, baseline);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const candidates = [];
  let minX = canvas.width;
  let maxX = 0;
  let minY = canvas.height;
  let maxY = 0;
  for (let y = 0; y < canvas.height; y += 3) {
    for (let x = 0; x < canvas.width; x += 3) {
      if (pixels[(y * canvas.width + x) * 4 + 3] < 72) continue;
      candidates.push(x, y);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  const targets = new Float32Array(particleCount * 3);
  const targetColors = new Float32Array(particleCount * 3);
  const glyphHeight = Math.max(1, maxY - minY);
  const scale = 27 / glyphHeight;
  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const candidateCount = candidates.length / 2;

  for (let particle = 0; particle < particleCount; particle++) {
    const offset = particle * 3;
    const candidateIndex = Math.floor(deterministicUnit(particle, 4) * candidateCount);
    const pixelOffset = candidateIndex * 2;
    const pixelX = candidates[pixelOffset];
    const pixelY = candidates[pixelOffset + 1];
    const depth = deterministicUnit(particle, 3);
    const verticalProgress = (pixelY - minY) / glyphHeight;
    targets[offset] = (pixelX - centerX) * scale
      + (deterministicUnit(particle, 5) - 0.5) * scale * 2.4;
    targets[offset + 1] = -(pixelY - centerY) * scale
      + (deterministicUnit(particle, 6) - 0.5) * scale * 2.4;
    targets[offset + 2] = centerZ + (depth - 0.5) * 0.9;
    const targetColor = logoColorAt(verticalProgress, depth);
    targetColors[offset] = targetColor.r;
    targetColors[offset + 1] = targetColor.g;
    targetColors[offset + 2] = targetColor.b;
  }

  return { targets, colors: targetColors };
}

export function makeFishOcean(surfaceHeightAt, reducedMotion = false) {
  const baseList = [];
  const baseColorList = [];
  const fish = [];

  SPECIES.forEach((species, speciesIndex) => {
    const schoolHeading = Math.random() * Math.PI * 2;
    const tint = new THREE.Color(species.tint);

    for (let fishIndex = 0; fishIndex < species.count; fishIndex++) {
      const built = construirPeixeOrganico(species.model.organico, randomBetween(...species.scale));
      const sourceColors = built.geo.attributes.color.array;
      const start = baseList.length / 3;

      for (let particle = 0; particle < built.n; particle++) {
        const source = particle * 3;
        baseList.push(built.base[source], built.base[source + 1], built.base[source + 2]);
        const sourceColor = new THREE.Color(
          sourceColors[source],
          sourceColors[source + 1],
          sourceColors[source + 2],
        ).lerp(tint, 0.28);
        baseColorList.push(sourceColor.r, sourceColor.g, sourceColor.b);
      }

      fish.push({
        start,
        count: built.n,
        x: randomBetween(-64, 64),
        y: randomBetween(-38, 38),
        heading: schoolHeading + randomBetween(-0.38, 0.38),
        speed: randomBetween(...species.speed),
        altitude: randomBetween(1.05, 3.25) + speciesIndex * 0.06,
        turnPhase: Math.random() * Math.PI * 2 + fishIndex * 0.19,
        turnSpeed: randomBetween(0.12, 0.28),
        turnAmount: randomBetween(0.07, 0.18),
        tailPhase: Math.random() * Math.PI * 2,
        captured: false,
        captureStart: 0,
      });
      built.geo.dispose();
    }
  });

  const base = new Float32Array(baseList);
  const baseColors = new Float32Array(baseColorList);
  const particleCount = base.length / 3;
  const positions = new Float32Array(base.length);
  const velocities = new Float32Array(base.length);
  const colors = new Float32Array(baseColors);
  const cloudCenterZ = surfaceHeightAt(0, 0) + 4;
  const letter = makeLetterTargets(particleCount, cloudCenterZ);
  const cloudTargets = letter.targets;
  const cloudColors = letter.colors;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.155,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  }));
  points.frustumCulled = false;
  points.renderOrder = 4;
  const motionScale = reducedMotion ? 0.28 : 1;
  const effectScale = reducedMotion ? 0.55 : 1;

  function captureFish(item, pointer, time) {
    item.captured = true;
    item.captureStart = time;
    const end = (item.start + item.count) * 3;
    for (let offset = item.start * 3; offset < end; offset += 3) {
      const particle = offset / 3;
      const dx = positions[offset] - pointer.worldX;
      const dy = positions[offset + 1] - pointer.worldY;
      const distanceSquared = dx * dx + dy * dy;
      const distance = Math.sqrt(Math.max(0.12, distanceSquared));
      const fallback = particle * 2.399963;
      const directionX = distanceSquared > 0.12 ? dx / distance : Math.cos(fallback);
      const directionY = distanceSquared > 0.12 ? dy / distance : Math.sin(fallback);
      const impulse = randomBetween(0.1, 0.2) * effectScale;
      velocities[offset] += directionX * impulse;
      velocities[offset + 1] += directionY * impulse;
      velocities[offset + 2] += randomBetween(-0.04, 0.09) * effectScale;
    }
  }

  function update(time, dt, pointer) {
    const step = Math.min(3, dt * 60);
    const initialized = dt === 0;

    fish.forEach((item) => {
      let wrapShiftX = 0;
      let wrapShiftY = 0;
      if (!item.captured) {
        const turn = Math.sin(time * item.turnSpeed + item.turnPhase) * item.turnAmount;
        const heading = item.heading + turn;
        item.x += Math.cos(heading) * item.speed * dt * motionScale;
        item.y += Math.sin(heading) * item.speed * dt * motionScale;
        if (item.x > 68) {
          item.x = -68;
          wrapShiftX = -136;
        } else if (item.x < -68) {
          item.x = 68;
          wrapShiftX = 136;
        }
        if (item.y > 41) {
          item.y = -41;
          wrapShiftY = -82;
        } else if (item.y < -41) {
          item.y = 41;
          wrapShiftY = 82;
        }

        if (pointer?.active) {
          const dx = item.x - pointer.worldX;
          const dy = item.y - pointer.worldY;
          if (dx * dx + dy * dy < 18) captureFish(item, pointer, time);
        }
      }

      const heading = item.heading;
      const cosHeading = Math.cos(heading);
      const sinHeading = Math.sin(heading);
      const fishAltitude = surfaceHeightAt(item.x, item.y) + item.altitude;
      const formation = item.captured
        ? THREE.MathUtils.smootherstep(time - item.captureStart, 0.22, 2.9)
        : 0;
      const spring = item.captured ? THREE.MathUtils.lerp(0.018, 0.082, formation) : 0.2;
      const friction = Math.pow(item.captured ? 0.89 : 0.8, step);
      const end = (item.start + item.count) * 3;

      for (let offset = item.start * 3; offset < end; offset += 3) {
        /* O alvo e os pixels atravessam a borda juntos. Sem este transporte,
           a mola tentaria puxar o peixe por toda a largura da tela. */
        positions[offset] += wrapShiftX;
        positions[offset + 1] += wrapShiftY;
        const localX = base[offset];
        const tailWeight = Math.max(0, -localX) * 0.1;
        const localY = base[offset + 1]
          + Math.sin(time * 4.2 + item.tailPhase + localX * 1.7) * tailWeight;
        const fishX = item.x + localX * cosHeading - localY * sinHeading;
        const fishY = item.y + localX * sinHeading + localY * cosHeading;
        const fishZ = fishAltitude + base[offset + 2];
        const cloudWave = Math.sin(
          time * 0.72 + cloudTargets[offset] * 0.17 + cloudTargets[offset + 1] * 0.11,
        );
        const cloudX = cloudTargets[offset];
        const cloudY = cloudTargets[offset + 1] + cloudWave * 0.055;
        const cloudZ = cloudTargets[offset + 2] + cloudWave * 0.075;
        const targetX = THREE.MathUtils.lerp(fishX, cloudX, formation);
        const targetY = THREE.MathUtils.lerp(fishY, cloudY, formation);
        const targetZ = THREE.MathUtils.lerp(fishZ, cloudZ, formation);

        if (initialized) {
          positions[offset] = targetX;
          positions[offset + 1] = targetY;
          positions[offset + 2] = targetZ;
        } else {
          velocities[offset] = (velocities[offset] + (targetX - positions[offset]) * spring * step) * friction;
          velocities[offset + 1] = (velocities[offset + 1] + (targetY - positions[offset + 1]) * spring * step) * friction;
          velocities[offset + 2] = (velocities[offset + 2] + (targetZ - positions[offset + 2]) * spring * step) * friction;
          positions[offset] += velocities[offset] * step;
          positions[offset + 1] += velocities[offset + 1] * step;
          positions[offset + 2] += velocities[offset + 2] * step;
        }

        const colorBlend = formation * 0.58;
        colors[offset] = THREE.MathUtils.lerp(baseColors[offset], cloudColors[offset], colorBlend);
        colors[offset + 1] = THREE.MathUtils.lerp(baseColors[offset + 1], cloudColors[offset + 1], colorBlend);
        colors[offset + 2] = THREE.MathUtils.lerp(baseColors[offset + 2], cloudColors[offset + 2], colorBlend);
      }
    });

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  update(0, 0);
  return { group: points, update };
}
