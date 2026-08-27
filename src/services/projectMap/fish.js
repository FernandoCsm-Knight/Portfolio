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

const LOGO_AQUA = new THREE.Color('#38bde3');
const LOGO_GOLD = new THREE.Color('#858e91');
const LOGO_PALE_GOLD = new THREE.Color('#aeb5b7');
const FISHES_TO_CONSOLIDATE = 10;

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
  context.font = "400 900px 'Norican', cursive";
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const metrics = context.measureText('F');
  const ascent = metrics.actualBoundingBoxAscent || 680;
  const descent = metrics.actualBoundingBoxDescent || 190;
  const baseline = canvas.height * 0.5 + (ascent - descent) * 0.5;
  context.fillText('F', canvas.width * 0.5, baseline);

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
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

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
    bounds.minX = Math.min(bounds.minX, targets[offset]);
    bounds.maxX = Math.max(bounds.maxX, targets[offset]);
    bounds.minY = Math.min(bounds.minY, targets[offset + 1]);
    bounds.maxY = Math.max(bounds.maxY, targets[offset + 1]);
    const targetColor = logoColorAt(verticalProgress, depth);
    targetColors[offset] = targetColor.r;
    targetColors[offset + 1] = targetColor.g;
    targetColors[offset + 2] = targetColor.b;
  }

  return { targets, colors: targetColors, bounds };
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
  const group = new THREE.Group();
  group.add(points);

  /* Uma amostra das partículas do F ganha uma segunda vida como neve
     marinha. O limite mantém o custo estável mesmo se novos cardumes forem
     adicionados no futuro. */
  const snowCount = Math.min(900, Math.max(180, Math.floor(particleCount * 0.18)));
  const snowPositions = new Float32Array(snowCount * 3);
  const snowColors = new Float32Array(snowCount * 3);
  const snowFallSpeeds = new Float32Array(snowCount);
  const snowPhases = new Float32Array(snowCount);
  const snowCycles = new Uint16Array(snowCount);
  const snowGeometry = new THREE.BufferGeometry();
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  snowGeometry.setAttribute('color', new THREE.BufferAttribute(snowColors, 3));
  const snowMaterial = new THREE.PointsMaterial({
    size: 0.18,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  });
  const marineSnow = new THREE.Points(snowGeometry, snowMaterial);
  marineSnow.visible = false;
  marineSnow.frustumCulled = false;
  marineSnow.renderOrder = 5;
  group.add(marineSnow);

  for (let index = 0; index < snowCount; index++) {
    const offset = index * 3;
    const warmth = deterministicUnit(index, 19);
    const snowColor = new THREE.Color('#c5dff0').lerp(new THREE.Color('#aeb5b7'), warmth * 0.48);
    snowColors[offset] = snowColor.r;
    snowColors[offset + 1] = snowColor.g;
    snowColors[offset + 2] = snowColor.b;
    snowFallSpeeds[index] = 0.72 + deterministicUnit(index, 20) * 1.18;
    snowPhases[index] = deterministicUnit(index, 21) * Math.PI * 2;
  }
  const motionScale = reducedMotion ? 0.28 : 1;
  const effectScale = reducedMotion ? 0.55 : 1;
  let capturedFishCount = FISHES_TO_CONSOLIDATE;
  let consolidated = true;
  let exploding = false;
  let explosionStart = 0;
  const explosionProjectionMatrix = new THREE.Matrix4();
  const explosionScreenPosition = new THREE.Vector3();

  /* A página começa no estado final da formação: o monograma já está pronto
     e aguarda uma ação explícita do visitante para explodir. */
  fish.forEach((item) => {
    item.captured = true;
    item.captureStart = -10;
  });

  function hasExplosionParticleOnScreen(camera) {
    if (!camera) return true;

    /* Verifica a posicao projetada em vez de encerrar o efeito por tempo. A
       pequena margem inclui o tamanho visual dos pontos junto as bordas. */
    camera.updateMatrixWorld();
    points.updateWorldMatrix(true, false);
    explosionProjectionMatrix
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .multiply(points.matrixWorld);

    for (let offset = 0; offset < positions.length; offset += 3) {
      explosionScreenPosition
        .set(positions[offset], positions[offset + 1], positions[offset + 2])
        .applyMatrix4(explosionProjectionMatrix);
      if (
        explosionScreenPosition.z >= -1
        && explosionScreenPosition.z <= 1
        && Math.abs(explosionScreenPosition.x) <= 1.02
        && Math.abs(explosionScreenPosition.y) <= 1.02
      ) return true;
    }
    return false;
  }

  function consolidateLetter(time) {
    consolidated = true;
    fish.forEach((item, index) => {
      if (item.captured) return;
      item.captured = true;
      /* O pequeno escalonamento faz os cardumes serem puxados em uma onda,
         sem atrasar demais a leitura do F completo. */
      item.captureStart = time + (index % 9) * 0.025;
    });
  }

  function captureFish(item, pointer, time) {
    item.captured = true;
    item.captureStart = time;
    capturedFishCount++;
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
    if (capturedFishCount >= FISHES_TO_CONSOLIDATE) consolidateLetter(time);
  }

  function explodeLetter(time, originX = 0, originY = 0) {
    if (exploding) return false;
    exploding = true;
    explosionStart = time;
    for (let offset = 0; offset < positions.length; offset += 3) {
      const particle = offset / 3;
      const dx = positions[offset] - originX;
      const dy = positions[offset + 1] - originY;
      const dz = positions[offset + 2] - cloudCenterZ;
      const distance = Math.hypot(dx, dy, dz) || 1;
      const planarDistance = Math.hypot(dx, dy);
      const fallback = particle * 2.399963;
      const directionX = planarDistance > 0.08 ? dx / planarDistance : Math.cos(fallback);
      const directionY = planarDistance > 0.08 ? dy / planarDistance : Math.sin(fallback);
      const directionZ = distance > 0.08 ? dz / distance : Math.sin(fallback * 0.73) * 0.35;
      const impulse = (0.3 + deterministicUnit(particle, 11) * 0.38)
        * (reducedMotion ? 0.55 : 1);
      const lateralImpulse = (deterministicUnit(particle, 12) - 0.5) * 0.28;
      velocities[offset] = directionX * impulse - directionY * lateralImpulse;
      velocities[offset + 1] = directionY * impulse + directionX * lateralImpulse;
      velocities[offset + 2] = directionZ * impulse
        + (deterministicUnit(particle, 14) - 0.5) * 0.34;
    }

    /* A neve é uma camada nova, preparada acima do visor. Ela não nasce no F:
       só entra depois que a explosão já atravessou as bordas da página. */
    for (let index = 0; index < snowCount; index++) {
      const snowOffset = index * 3;
      snowPositions[snowOffset] = (deterministicUnit(index, 31) - 0.5) * 108;
      snowPositions[snowOffset + 1] = 35 + deterministicUnit(index, 47) * 13;
      snowPositions[snowOffset + 2] = cloudCenterZ - 8 + deterministicUnit(index, 59) * 18;
    }
    marineSnow.visible = false;
    snowGeometry.attributes.position.needsUpdate = true;
    return true;
  }

  function containsPointer(pointer) {
    if (exploding || !pointer?.active) return false;
    const padding = 1.4;
    return pointer.worldX >= letter.bounds.minX - padding
      && pointer.worldX <= letter.bounds.maxX + padding
      && pointer.worldY >= letter.bounds.minY - padding
      && pointer.worldY <= letter.bounds.maxY + padding;
  }

  function triggerExplosion(pointer, time = performance.now() / 1000) {
    if (!consolidated) return false;
    return explodeLetter(time, pointer?.worldX ?? 0, pointer?.worldY ?? 0);
  }

  function update(time, dt, pointer, camera) {
    const step = Math.min(3, dt * 60);
    const initialized = dt === 0;

    if (exploding) {
      const age = time - explosionStart;
      const friction = Math.pow(0.998, step);
      for (let offset = 0; offset < positions.length; offset += 3) {
        velocities[offset] *= friction;
        velocities[offset + 1] *= friction;
        velocities[offset + 2] *= friction;
        positions[offset] += velocities[offset] * step;
        positions[offset + 1] += velocities[offset + 1] * step;
        positions[offset + 2] += velocities[offset + 2] * step;
      }
      points.material.opacity = 0.92;
      points.visible = points.visible && hasExplosionParticleOnScreen(camera);

      const snowStart = reducedMotion ? 1.05 : 2.85;
      const snowAge = age - snowStart;
      if (snowAge >= 0) {
        marineSnow.visible = true;
        for (let index = 0; index < snowCount; index++) {
          const offset = index * 3;
          const drift = Math.sin(time * 0.62 + snowPhases[index]) * 0.24;
          snowPositions[offset] += drift * dt;
          snowPositions[offset + 1] -= snowFallSpeeds[index] * dt;
          snowPositions[offset + 2] += Math.cos(time * 0.39 + snowPhases[index]) * 0.055 * dt;

          if (snowPositions[offset + 1] < -35) {
            const cycle = ++snowCycles[index];
            snowPositions[offset] = (deterministicUnit(index, 31 + cycle) - 0.5) * 108;
            snowPositions[offset + 1] = 35 + deterministicUnit(index, 47 + cycle) * 8;
            snowPositions[offset + 2] = cloudCenterZ - 8 + deterministicUnit(index, 59 + cycle) * 18;
          }
        }
        snowMaterial.opacity = 0.82 * THREE.MathUtils.smootherstep(snowAge, 0, 0.7);
        snowGeometry.attributes.position.needsUpdate = true;
      }
      geometry.attributes.position.needsUpdate = true;
      return {
        formationProgress: 1,
        consolidated: true,
        capturedFishCount: FISHES_TO_CONSOLIDATE,
        exploded: true,
      };
    }

    let formedParticleCount = 0;

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
      formedParticleCount += item.count * formation;
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
    /* Depois do gatilho, o monograma é o núcleo do carrossel: permanece
       legível mesmo quando um card atravessa a metade frontal do anel. */
    points.renderOrder = consolidated ? 10 : 4;
    points.material.depthTest = !consolidated;
    const formationProgress = formedParticleCount / particleCount;
    return {
      formationProgress,
      consolidated,
      capturedFishCount: Math.min(capturedFishCount, FISHES_TO_CONSOLIDATE),
      exploded: false,
    };
  }

  update(0, 0);
  return { group, update, containsPointer, triggerExplosion };
}
