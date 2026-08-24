import * as THREE from 'three';
import { disposeSceneResources, getWebGLPixelRatio, precompileRenderer } from '../ocean/webglUtils';
import { deepChannelCenterX, makePoints } from './utils';
import { makeWaterParticles } from './water';
import { makeMigrationCorridor, updateMigrationCorridor } from './migration';
import { makeProjectTerrain } from './terrain';
import { makeDeepFishSchools, makeReefFish } from './schools';
import { makeDetailedThemeModel, makeSunkenTreasure } from './habitats';
import { makeReefRegion } from './reef';
import { makeMarker } from './cartography';
import { makeSharks, makeWhales } from './predators';

export function createProjectMapScene(canvas, projects, { reducedMotion = false } = {}) {
  const fMov = reducedMotion ? 0.3 : 1;
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, stencil: false, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(getWebGLPixelRatio(window.innerWidth));
  renderer.setClearColor(0x052630, 1);
  const scene = new THREE.Scene();

  /* perda/restauração de contexto é tratada internamente pelo WebGLRenderer */
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
  camera.position.set(0, 0, 78);

  scene.add(new THREE.HemisphereLight(0x78c9c2, 0x031722, 0.82));
  const terrainLight = new THREE.DirectionalLight(0xa7e1d5, 1.28);
  terrainLight.position.set(-38, 20, 18);
  scene.add(terrainLight);

  const projectTerrain = makeProjectTerrain(projects);
  scene.add(projectTerrain);
  const projectBiomes = projects.map((project) => projectTerrain.userData.biomeAt(project.map.x, project.map.y));

  const gridPts = [];
  const gridCols = [];
  const gridC = new THREE.Color('#3b2a18');
  for (let x = -40; x <= 40; x += 10) {
    for (let y = -23; y <= 23; y += 1.3) {
      const gridX = x + Math.sin(y) * 0.08;
      gridPts.push(gridX, y, projectTerrain.userData.surfaceHeightAt(gridX, y) + 0.035);
      gridCols.push(gridC.r, gridC.g, gridC.b);
    }
  }
  for (let y = -20; y <= 20; y += 10) {
    for (let x = -44; x <= 44; x += 1.3) {
      const gridY = y + Math.cos(x) * 0.08;
      gridPts.push(x, gridY, projectTerrain.userData.surfaceHeightAt(x, gridY) + 0.035);
      gridCols.push(gridC.r, gridC.g, gridC.b);
    }
  }
  const grid = makePoints(gridPts, gridCols, 0.1, 0.22, THREE.NormalBlending);
  scene.add(grid);

  const migrationCorridor = makeMigrationCorridor();
  scene.add(migrationCorridor.group);

  const waterParticles = makeWaterParticles();
  scene.add(waterParticles);

  const sharkData = makeSharks();
  scene.add(sharkData.bodyObj);
  scene.add(sharkData.finObj);
  const whaleData = makeWhales();
  scene.add(whaleData.group);

  const projectAbyssSchools = projects.flatMap((project, index) => {
    if (projectBiomes[index] !== 'abyss') return [];
    return [{
      cx: project.map.x + 1.5,
      cy: project.map.y + 2.2,
      rx: 5.2,
      ry: 1.9,
      speed: 0.085,
      phase: 1.7 + index,
      z: projectTerrain.userData.surfaceHeightAt(project.map.x, project.map.y) + 1.45,
      count: 5,
      spread: 2.2,
      tint: index % 2 ? '#b987ff' : '#62d7c6',
    }];
  });

  /* Pequenos grupos soltos percorrem toda a extensão inferior do canal.
     Cada latitude recebe órbita, altura e dispersão diferentes para não
     parecer um único cardume concentrado em torno de um ponto de interesse. */
  const abyssLatitudes = [-22, -19.6, -17.1, -14.7, -12.2, -9.7, -7.2, -4.7, -2.1];
  const abyssTints = [
    '#58cfff', '#6ab8ff', '#8b9cff',
    '#ad86ff', '#d47fdf', '#e68fae',
    '#63d5c0', '#5be49a', '#a6df69',
  ];
  const channelAbyssSchools = abyssLatitudes.flatMap((y, index) => {
    const centerX = deepChannelCenterX(y);
    const offsetX = (index % 2 ? 1 : -1) * (1.4 + (index % 3) * 0.65);
    const candidateX = centerX + offsetX;
    const x = projectTerrain.userData.biomeAt(candidateX, y) === 'abyss' ? candidateX : centerX;
    if (projectTerrain.userData.biomeAt(x, y) !== 'abyss') return [];
    return [{
      cx: x,
      cy: y,
      rx: 4.1 + (index % 3) * 0.75,
      ry: 1.15 + (index % 2) * 0.65,
      speed: (index % 2 ? -1 : 1) * (0.055 + index * 0.006),
      phase: 0.8 + index * 1.37,
      z: projectTerrain.userData.surfaceHeightAt(x, y) + 1.05 + (index % 3) * 0.48,
      count: 3 + (index % 2),
      spread: 3.8 + (index % 3) * 0.7,
      tint: abyssTints[index],
      tintMix: 0.74,
    }];
  });
  const commandPanelSchools = projects.flatMap((project, index) => {
    if (project.map.feature !== 'deep-fish') return [];
    const upperY = project.map.y + 7;
    const upperX = project.map.x + 4.2;
    return [
      {
        cx: project.map.x + 0.8,
        cy: project.map.y - 0.5,
        rx: 5.4,
        ry: 2.15,
        speed: -0.075,
        phase: 2.4 + index,
        z: projectTerrain.userData.surfaceHeightAt(project.map.x, project.map.y) + 1.5,
        count: 10,
        spread: 3.8,
        tint: '#ff9b66',
        tintMix: 0.76,
      },
      {
        cx: upperX,
        cy: upperY,
        rx: 5.8,
        ry: 2.4,
        speed: 0.068,
        phase: 4.1 + index,
        z: projectTerrain.userData.surfaceHeightAt(upperX, upperY) + 1.75,
        count: 9,
        spread: 4.2,
        tint: '#75e39d',
        tintMix: 0.74,
      },
    ];
  });
  const treasureSchools = projects.flatMap((project, index) => {
    if (project.map.feature !== 'treasure') return [];
    return [{
      cx: project.map.x + 5.5,
      cy: project.map.y + 0.8,
      rx: 6.2,
      ry: 2.35,
      speed: 0.082,
      phase: 1.15 + index,
      z: projectTerrain.userData.surfaceHeightAt(project.map.x, project.map.y) + 1.85,
      count: 8,
      spread: 3.1,
      tint: '#ffd264',
      tintMix: 0.8,
    }];
  });
  const deepFishSchools = makeDeepFishSchools([
    ...projectAbyssSchools,
    ...channelAbyssSchools,
    ...commandPanelSchools,
    ...treasureSchools,
  ]);
  scene.add(deepFishSchools.fishObj);

  const vegetatedProjects = projects.filter((_, index) => projectBiomes[index] === 'reef');
  const reefFish = makeReefFish(projectTerrain, vegetatedProjects);
  scene.add(reefFish);

  const markers = projects.map((project, i) => {
    const marker = makeMarker(project, i);
    marker.position.z = projectTerrain.userData.surfaceHeightAt(project.map.x, project.map.y) + 0.26;
    scene.add(marker);
    return marker;
  });
  const markerPlants = [];
  let sunkenTreasure = null;
  projects.forEach((project, i) => {
    const surfaceZ = projectTerrain.userData.surfaceHeightAt(project.map.x, project.map.y);
    const biome = projectBiomes[i];
    if (biome === 'reef') {
      const plants = makeReefRegion(projectTerrain, project, i);
      scene.add(plants);
      markerPlants.push(plants);
      return;
    }

    if (project.map.feature === 'migration') return;
    if (project.map.feature === 'treasure') {
      sunkenTreasure = makeSunkenTreasure(surfaceZ);
      sunkenTreasure.position.x = project.map.x;
      sunkenTreasure.position.y = project.map.y;
      scene.add(sunkenTreasure);
      return;
    }
    if (project.map.feature === 'deep-fish') {
      return;
    }

    const theme = biome === 'abyss'
      ? 'cave'
      : biome === 'canyon'
      ? 'canyon'
      : 'wreck';
    const field = { cx: project.map.x, cy: project.map.y, rx: 7.2, ry: 4.8, seed: i + 1 };
    const habitat = makeDetailedThemeModel(field, theme);
    /* Os modelos antigos usam z≈1.1 como plano-base; este deslocamento os
       assenta na altura local do novo terreno. */
    habitat.position.z = surfaceZ - 1.08;
    scene.add(habitat);
  });
  const pointer = { x: 0, y: 0 };
  const pointerDir = new THREE.Vector3();
  const pointerWorld = new THREE.Vector3();
  let active = 0;
  /* `active` é o marcador em destaque, que permanece após o cursor sair;
     `hovered` é o que está sob o cursor agora — null em água aberta. Separar
     os dois é o que permite não abrir projeto nenhum ao clicar no vazio. */
  let hovered = null;
  let targetRotX = 0;
  let targetRotY = 0;
  let last = performance.now();

  function resize(width, height) {
    renderer.setPixelRatio(getWebGLPixelRatio(width));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function updatePointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    targetRotY = pointer.x * 0.08;
    targetRotX = -pointer.y * 0.05;

    pointerDir.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
    const t = -camera.position.z / pointerDir.z;
    pointerWorld.copy(camera.position).addScaledVector(pointerDir, t);
    const worldX = pointerWorld.x;
    const worldY = pointerWorld.y;

    let nearest = null;
    let best = 5.2;
    markers.forEach((marker, i) => {
      const dx = marker.position.x - worldX;
      const dy = marker.position.y - worldY;
      const dist = Math.hypot(dx, dy);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    hovered = nearest;
    if (hovered !== null) active = hovered;
  }

  /* Ponteiro fora da janela: sem isto o vazio aberto na água ficaria congelado
     na última posição, e o marcador seguiria marcado como sob o cursor. */
  function clearPointer() {
    hovered = null;
    targetRotX = 0;
    targetRotY = 0;
  }

  /* Devolve o projeto sob o cursor em vez de navegar: quem decide o destino
     (e se abre em nova aba) é a camada React, igual à cena do oceano. Um
     serviço de renderização não deveria mexer em window.location. */
  function handleClick() {
    return hovered !== null ? projects[hovered] : null;
  }

  function update() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;

    scene.rotation.x += (targetRotX - scene.rotation.x) * Math.min(1, dt * 3.8);
    scene.rotation.y += (targetRotY - scene.rotation.y) * Math.min(1, dt * 3.8);
    const waterPositions = waterParticles.geometry.attributes.position.array;
    const { base: waterBase, count: waterCount, wavePhaseA, wavePhaseB, wavePhaseC, wavePhaseD, wavePhaseE } = waterParticles.userData;
    for (let i = 0; i < waterCount; i++) {
      const offset = i * 3;
      waterPositions[offset] =
        waterBase[offset] + Math.sin(t * 0.4 + wavePhaseA[i]) * 0.72 + Math.sin(t * 0.18 + wavePhaseB[i]) * 0.28;
      waterPositions[offset + 1] =
        waterBase[offset + 1] + Math.sin(t * 0.7 + wavePhaseC[i]) * 0.34 + Math.cos(t * 0.24 + wavePhaseD[i]) * 0.12;
      waterPositions[offset + 2] = waterBase[offset + 2] + Math.cos(t * 0.32 + wavePhaseE[i]) * 0.3;
    }
    waterParticles.geometry.attributes.position.needsUpdate = true;
    waterParticles.material.opacity = 0.34 + Math.sin(t * 0.5) * 0.055;
    updateMigrationCorridor(migrationCorridor, t, fMov);
    {
      const positions = deepFishSchools.fishObj.geometry.attributes.position.array;
      const { base, wavePhaseY, waveAmpY, wavePhaseZ } = deepFishSchools;
      deepFishSchools.fish.forEach((meta, fishIndex) => {
        const school = meta.school;
        const orbit = t * school.speed * fMov + school.phase + meta.orbitOffset;
        const nextOrbit = orbit + Math.sign(school.speed) * 0.025;
        const x = school.cx + Math.cos(orbit) * school.rx;
        const y = school.cy + Math.sin(orbit) * school.ry;
        const nextX = school.cx + Math.cos(nextOrbit) * school.rx;
        const nextY = school.cy + Math.sin(nextOrbit) * school.ry;
        const heading = Math.atan2(nextY - y, nextX - x);
        const cosH = Math.cos(heading), sinH = Math.sin(heading);
        const sideX = -sinH, sideY = cosH;
        const bob = Math.sin(t * 0.8 + meta.phase) * 0.12;
        const fishX = x + cosH * meta.offsetX + sideX * meta.offsetY;
        const fishY = y + sinH * meta.offsetX + sideY * meta.offsetY + bob;
        const fishZ = (school.z ?? 1.75) + Math.sin(t * 0.38 + fishIndex) * 0.22;
        const flip = cosH < 0 ? -1 : 1;

        const start = meta.start * 3, end = start + meta.count * 3;
        for (let idx = start, k = meta.start; idx < end; idx += 3, k++) {
          const bx = base[idx];
          const ly = (base[idx + 1] + Math.sin(t * 4.4 + wavePhaseY[k]) * waveAmpY[k]) * flip;
          const lz = base[idx + 2] + Math.cos(t * 2 + wavePhaseZ[k]) * 0.03;
          positions[idx] = fishX + (bx * cosH - ly * sinH);
          positions[idx + 1] = fishY + (bx * sinH + ly * cosH);
          positions[idx + 2] = fishZ + lz;
        }
      });
      deepFishSchools.fishObj.geometry.attributes.position.needsUpdate = true;
    }
    const reefFishPositions = reefFish.geometry.attributes.position.array;
    reefFish.userData.fishMeta.forEach((fish, fishIndex) => {
      const orbit = t * fish.speed * fMov + fish.phase;
      const radius = fish.radius + Math.sin(t * 0.42 + fish.phase) * fish.wobble;
      const x = fish.centerX + Math.cos(orbit) * radius;
      const y = fish.centerY + Math.sin(orbit) * radius * fish.verticalScale;
      const nextOrbit = orbit + Math.sign(fish.speed) * 0.025;
      const nextX = fish.centerX + Math.cos(nextOrbit) * radius;
      const nextY = fish.centerY + Math.sin(nextOrbit) * radius * fish.verticalScale;
      const heading = Math.atan2(nextY - y, nextX - x);
      const forwardX = Math.cos(heading);
      const forwardY = Math.sin(heading);
      const tailWiggle = Math.sin(t * 5.2 + fish.phase) * 0.055;
      const fishZ = fish.depth + Math.sin(t * 0.75 + fish.phase) * 0.12;

      for (let q = 0; q < reefFish.userData.pointsPerFish; q++) {
        const offset = (fishIndex * reefFish.userData.pointsPerFish + q) * 3;
        const bodyOffset = (q - 2) * 0.16;
        reefFishPositions[offset] = x + forwardX * bodyOffset - forwardY * tailWiggle * (2 - q);
        reefFishPositions[offset + 1] = y + forwardY * bodyOffset + forwardX * tailWiggle * (2 - q);
        reefFishPositions[offset + 2] = fishZ;
      }
    });
    reefFish.geometry.attributes.position.needsUpdate = true;
    const halfT = t * 0.5;
    markerPlants.forEach((plantGroup) => {
      const plant = plantGroup.children[0];
      if (!plant?.userData.base) return;
      const positions = plant.geometry.attributes.position.array;
      const { base, phaseSway1, ampSway1, phaseSway2, ampSway2, speed, rotCos, rotSin } = plant.userData;
      for (let i = 0, k = 0; i < positions.length; i += 3, k++) {
        const dx = Math.sin(t * speed[k] + phaseSway1[k]) * ampSway1[k];
        const dy = Math.cos(halfT + phaseSway2[k]) * ampSway2[k];
        positions[i] = base[i] + (dx * rotCos[k] - dy * rotSin[k]);
        positions[i + 1] = base[i + 1] + (dx * rotSin[k] + dy * rotCos[k]);
        positions[i + 2] = base[i + 2];
      }
      plant.geometry.attributes.position.needsUpdate = true;
    });
    {
      const bodyPositions = sharkData.bodyObj.geometry.attributes.position.array;
      const finPositions = sharkData.finObj.geometry.attributes.position.array;
      const { bodyBase, finBase, bodySwayPhase, bodySwayAmp, finTailPower } = sharkData;
      sharkData.sharks.forEach((meta) => {
        const patrol = meta.patrol;
        const orbit = t * patrol.speed * fMov + patrol.phase;
        const wobble = Math.sin(t * patrol.wave + patrol.phase) * 0.28;
        const x = patrol.cx + Math.cos(orbit) * patrol.rx + Math.sin(orbit * 2.1) * wobble;
        const y = patrol.cy + Math.sin(orbit) * patrol.ry + Math.cos(orbit * 1.7) * wobble;
        const nextOrbit = orbit + Math.sign(patrol.speed || 1) * 0.04;
        const nextWobble = Math.sin((t + 0.04) * patrol.wave + patrol.phase) * 0.28;
        const nextX = patrol.cx + Math.cos(nextOrbit) * patrol.rx + Math.sin(nextOrbit * 2.1) * nextWobble;
        const nextY = patrol.cy + Math.sin(nextOrbit) * patrol.ry + Math.cos(nextOrbit * 1.7) * nextWobble;
        const heading = Math.atan2(nextY - y, nextX - x);
        const cosH = Math.cos(heading), sinH = Math.sin(heading);
        const scaleK = patrol.scale;
        const tail = Math.sin(t * 4.2 + meta.phase);

        const bStart = meta.bodyStart * 3, bEnd = bStart + meta.bodyCount * 3;
        for (let idx = bStart, k = meta.bodyStart; idx < bEnd; idx += 3, k++) {
          const bx = bodyBase[idx], by = bodyBase[idx + 1], bz = bodyBase[idx + 2];
          const sway = Math.sin(t * 2.4 + bodySwayPhase[k]) * bodySwayAmp[k];
          const lx = bx * scaleK;
          const ly = (by + sway) * scaleK;
          const lz = (bz + Math.cos(t * 1.8 + bx) * 0.018) * scaleK;
          bodyPositions[idx] = x + lx * cosH - ly * sinH;
          bodyPositions[idx + 1] = y + lx * sinH + ly * cosH;
          bodyPositions[idx + 2] = 2.8 + lz;
        }

        const fStart = meta.finStart * 3, fEnd = fStart + meta.finCount * 3;
        for (let idx = fStart, k = meta.finStart; idx < fEnd; idx += 3, k++) {
          const bx = finBase[idx], by = finBase[idx + 1], bz = finBase[idx + 2];
          const lx = bx * scaleK;
          const ly = (by + tail * finTailPower[k]) * scaleK;
          const lz = (bz + Math.max(0, tail) * 0.025) * scaleK;
          finPositions[idx] = x + lx * cosH - ly * sinH;
          finPositions[idx + 1] = y + lx * sinH + ly * cosH;
          finPositions[idx + 2] = 2.8 + lz;
        }
      });
      sharkData.bodyObj.geometry.attributes.position.needsUpdate = true;
      sharkData.finObj.geometry.attributes.position.needsUpdate = true;
    }

    whaleData.whales.forEach((whale, whaleIndex) => {
      const { object, patrol, base, wavePhaseY, waveAmpY, wavePhaseZ, waveAmpZ } = whale;
      const orbit = t * patrol.speed * fMov + patrol.phase;
      const nextOrbit = orbit + 0.025;
      const x = patrol.cx + Math.cos(orbit) * patrol.rx;
      const y = patrol.cy + Math.sin(orbit) * patrol.ry;
      const nextX = patrol.cx + Math.cos(nextOrbit) * patrol.rx;
      const nextY = patrol.cy + Math.sin(nextOrbit) * patrol.ry;
      const heading = Math.atan2(nextY - y, nextX - x);
      object.position.set(x, y + Math.sin(t * 0.34 + whaleIndex) * 0.14, 3.15 + whaleIndex * 0.08);
      object.rotation.z = heading;
      object.scale.y = Math.cos(heading) < 0 ? -1 : 1;

      const positions = object.geometry.attributes.position.array;
      for (let i = 0, j = 0; j < positions.length; i++, j += 3) {
        positions[j] = base[j];
        positions[j + 1] = base[j + 1] + Math.sin(t * 1.85 + wavePhaseY[i]) * waveAmpY[i];
        positions[j + 2] = base[j + 2] + Math.cos(t * 1.5 + wavePhaseZ[i]) * waveAmpZ[i];
      }
      object.geometry.attributes.position.needsUpdate = true;
    });

    if (sunkenTreasure) {
      const treasureData = sunkenTreasure.userData;
      treasureData.sparkles.material.opacity =
        0.72 + Math.sin(t * 1.1 + treasureData.phase) * 0.16;
    }

    markers.forEach((marker, i) => {
      const isActive = i === active;
      const pulse = 1 + Math.sin(t * 2.2 + i) * 0.08;
      const pingProgress = (t * 0.65 + i * 0.17) % 1;
      marker.scale.setScalar(isActive ? 1.22 * pulse : 0.86 + Math.sin(t + i) * 0.025);
      marker.userData.ring.material.opacity = isActive ? 0.75 : 0.36;
      marker.userData.ping.scale.setScalar(1.2 + pingProgress * 1.6);
      marker.userData.ping.material.opacity = isActive ? 0.42 * (1 - pingProgress) : 0;
    });

    renderer.render(scene, camera);

    /* mesmo contrato da cena do oceano: o frame reporta o que está sob o
       cursor, e a camada React decide o que fazer com isso. */
    return { hoveredProject: hovered !== null ? projects[hovered] : null };
  }

  function dispose() {
    disposeSceneResources(scene);
    renderer.dispose();
  }

  function prepare() {
    return precompileRenderer(renderer, scene, camera);
  }

  return { resize, updatePointer, clearPointer, handleClick, prepare, update, dispose };
}
