import * as THREE from 'three';

function createRandomSource() {
  const seedBuffer = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(seedBuffer);
  else seedBuffer[0] = Math.floor(Math.random() * 0xffffffff);
  let state = seedBuffer[0] || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gera uma dorsal ou depressão seguindo uma curva suave que atravessa o mapa. */
function createCurveFeature(random, width, height) {
  const controlPoints = [];
  const controlCount = 7;
  let directionX = random() - 0.5;
  let directionY = random() - 0.5;
  const directionLength = Math.hypot(directionX, directionY) || 1;
  directionX /= directionLength;
  directionY /= directionLength;
  const perpendicularX = -directionY;
  const perpendicularY = directionX;
  const centerX = (random() - 0.5) * width * 0.42;
  const centerY = (random() - 0.5) * height * 0.42;
  const span = Math.hypot(width, height) * 0.72;

  for (let i = 0; i < controlCount; i++) {
    const progress = i / (controlCount - 1);
    const across = (progress - 0.5) * span;
    const bend = (random() - 0.5) * Math.min(width, height) * 0.34;
    controlPoints.push(new THREE.Vector3(
      centerX + directionX * across + perpendicularX * bend,
      centerY + directionY * across + perpendicularY * bend,
      0,
    ));
  }

  const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal');
  const sampledPoints = curve.getPoints(76);
  const samples = new Float32Array(sampledPoints.length * 2);
  sampledPoints.forEach((point, pointIndex) => {
    samples[pointIndex * 2] = point.x;
    samples[pointIndex * 2 + 1] = point.y;
  });

  const isTrench = random() < 0.42;
  return {
    samples,
    radius: 7 + random() * 10,
    amplitude: (isTrench ? -1 : 1) * (0.75 + random() * 1.45),
  };
}

export function makeProjectTerrain() {
  const width = 220;
  const height = 140;
  const geometry = new THREE.PlaneGeometry(width, height, 180, 112);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const random = createRandomSource();
  const terrainOffsetZ = -0.52;

  const curveFeatures = Array.from(
    { length: 8 },
    () => createCurveFeature(random, width, height),
  );
  const slopeX = (random() - 0.5) * 0.009;
  const slopeY = (random() - 0.5) * 0.009;
  const saddle = (random() - 0.5) * 0.38;

  function evaluateSurface(x, y) {
    let z = -1.65 + x * slopeX + y * slopeY + (x / 110) * (y / 70) * saddle;
    let curveSignal = 0;

    curveFeatures.forEach((feature) => {
      let nearestSquared = Infinity;
      /* A distância contínua aos segmentos preserva a curva suave sem criar
         os picos igualmente espaçados da primeira implementação. */
      for (let i = 0; i < feature.samples.length - 2; i += 2) {
        const ax = feature.samples[i];
        const ay = feature.samples[i + 1];
        const segmentX = feature.samples[i + 2] - ax;
        const segmentY = feature.samples[i + 3] - ay;
        const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
        const projection = segmentLengthSquared > 0
          ? THREE.MathUtils.clamp(
            ((x - ax) * segmentX + (y - ay) * segmentY) / segmentLengthSquared,
            0,
            1,
          )
          : 0;
        const dx = x - (ax + segmentX * projection);
        const dy = y - (ay + segmentY * projection);
        nearestSquared = Math.min(nearestSquared, dx * dx + dy * dy);
      }

      const influence = Math.exp(-nearestSquared / (2 * feature.radius * feature.radius));
      const contribution = feature.amplitude * influence;
      z += contribution;
      curveSignal += contribution;
    });

    const edgeDepth = THREE.MathUtils.smootherstep(Math.hypot(x / 110, y / 70), 0.68, 1) * 0.9;
    return { z: z - edgeDepth, curveSignal };
  }

  const abyss = new THREE.Color('#071329');
  const indigo = new THREE.Color('#172d50');
  const slate = new THREE.Color('#315568');
  const shelf = new THREE.Color('#5f7980');
  const coldSand = new THREE.Color('#a49b86');
  const trenchTint = new THREE.Color('#191a3d');
  const color = new THREE.Color();

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const surface = evaluateSurface(x, y);
    positions.setZ(i, surface.z);

    const level = THREE.MathUtils.clamp((surface.z + 5.2) / 7.1, 0, 1);
    if (level < 0.27) color.copy(abyss).lerp(indigo, level / 0.27);
    else if (level < 0.55) color.copy(indigo).lerp(slate, (level - 0.27) / 0.28);
    else if (level < 0.8) color.copy(slate).lerp(shelf, (level - 0.55) / 0.25);
    else color.copy(shelf).lerp(coldSand, (level - 0.8) / 0.2);

    const trenchStrength = THREE.MathUtils.clamp(-surface.curveSignal * 0.18, 0, 0.34);
    color.lerp(trenchTint, trenchStrength);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.91,
    metalness: 0.04,
    side: THREE.DoubleSide,
    depthWrite: true,
  }));
  terrain.position.z = terrainOffsetZ;
  terrain.userData.surfaceHeightAt = (x, y) => evaluateSurface(x, y).z + terrainOffsetZ;
  return terrain;
}
