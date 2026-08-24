import * as THREE from 'three';
import { rnd } from '../ocean/utils';

function sampleMigrationRoute(progress, out) {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  const twoPiT = Math.PI * 2 * t;
  out.x = 50 - 100 * t + Math.sin(twoPiT) * 2;
  const baseY = -18 + 36 * t + Math.sin(Math.PI * 3 * t + 0.25) * 4.2 + Math.sin(Math.PI * 7 * t) * 0.75;
  const enterT = THREE.MathUtils.clamp((t - 0.5) / 0.2, 0, 1);
  const enter = enterT * enterT * enterT * (enterT * (enterT * 6 - 15) + 10);
  const enterDerivative = t > 0.5 && t < 0.7
    ? (30 * enterT ** 4 - 60 * enterT ** 3 + 30 * enterT ** 2) / 0.2
    : 0;
  const detourBlend = enter;
  const detourDerivative = enterDerivative;
  const detourPhase = ((t - 0.7) * Math.PI) / 0.2;
  const detourY = -1.5 + Math.sin(detourPhase) * 0.75;
  out.y = THREE.MathUtils.lerp(baseY, detourY, detourBlend);
  const dx = -100 + Math.cos(twoPiT) * Math.PI * 4;
  const baseDy =
    36 +
    Math.cos(Math.PI * 3 * t + 0.25) * 12.6 * Math.PI +
    Math.cos(Math.PI * 7 * t) * 5.25 * Math.PI;
  const detourDy = Math.cos(detourPhase) * (0.75 * Math.PI / 0.2);
  const dy =
    baseDy +
    detourDerivative * (detourY - baseY) +
    detourBlend * (detourDy - baseDy);
  const length = Math.hypot(dx, dy) || 1;
  out.tx = dx / length;
  out.ty = dy / length;
  out.nx = -out.ty;
  out.ny = out.tx;
  return out;
}

export function makeMigrationCorridor() {
  const group = new THREE.Group();
  const currentCount = 560;
  const currentPositions = new Float32Array(currentCount * 3);
  const currentColors = new Float32Array(currentCount * 3);
  const currentProgress = new Float32Array(currentCount);
  const currentLane = new Float32Array(currentCount);
  const currentSpeed = new Float32Array(currentCount);
  const currentPhase = new Float32Array(currentCount);
  /* o tom escuro da ponta da rampa quase sumia contra o fundo do mapa; os dois
     extremos sobem em luminosidade para o fluxo aparecer inteiro, e não só nas
     partículas que calharam de sortear o lado claro do gradiente. */
  const currentA = new THREE.Color('#43b3a4');
  const currentB = new THREE.Color('#c8f5e8');

  for (let i = 0; i < currentCount; i++) {
    currentProgress[i] = Math.random();
    currentLane[i] = rnd(-4.4, 4.4) * (Math.random() > 0.5 ? 1 : 0.55);
    currentSpeed[i] = rnd(0.006, 0.013);
    currentPhase[i] = rnd(0, Math.PI * 2);
    const color = currentA.clone().lerp(currentB, Math.random() * 0.8);
    currentColors[i * 3] = color.r;
    currentColors[i * 3 + 1] = color.g;
    currentColors[i * 3 + 2] = color.b;
  }
  const currentGeometry = new THREE.BufferGeometry();
  currentGeometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
  currentGeometry.setAttribute('color', new THREE.BufferAttribute(currentColors, 3));
  const current = new THREE.Points(currentGeometry, new THREE.PointsMaterial({
    size: 0.24,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }));
  group.add(current);

  const turtlePositions = [];
  const turtleColors = [];
  const turtles = [];
  const shellRim = new THREE.Color('#3d2a1d');
  const shellBase = new THREE.Color('#986738');
  const shellPlate = new THREE.Color('#d5aa5e');
  const shellHighlight = new THREE.Color('#efd08a');
  const skinDark = new THREE.Color('#285b54');
  const skinLight = new THREE.Color('#79b89c');
  const eye = new THREE.Color('#071514');
  const turtleCount = 7;

  for (let turtleIndex = 0; turtleIndex < turtleCount; turtleIndex++) {
    const scale = rnd(0.48, 0.72);
    const localX = [];
    const localY = [];
    const localZ = [];
    const flap = [];
    const localColors = [];
    function addPoint(x, y, z, color, flapAmount = 0) {
      localX.push(x * scale);
      localY.push(y * scale);
      localZ.push(z * scale);
      flap.push(flapAmount * scale);
      localColors.push(color.r, color.g, color.b);
    }

    /* casco preenchido em âmbar, com aro escuro e placas radiais legíveis */
    for (let i = 0; i < 145; i++) {
      const angle = rnd(0, Math.PI * 2);
      const radius = Math.sqrt(Math.random());
      const platePattern = 0.22 + (Math.sin(angle * 3 + radius * 8) * 0.5 + 0.5) * 0.48;
      const shade = radius > 0.84
        ? shellRim
        : shellBase.clone().lerp(shellPlate, platePattern);
      addPoint(Math.cos(angle) * 1.22 * radius, Math.sin(angle) * 0.76 * radius, 0.06 + 0.09 * (1 - radius), shade);
    }
    for (let i = 0; i < 58; i++) {
      const angle = (i / 58) * Math.PI * 2;
      addPoint(Math.cos(angle) * 1.23, Math.sin(angle) * 0.77, 0.07, i % 5 === 0 ? shellHighlight : shellRim);
    }
    [0.36, 0.66].forEach((ringRadius) => {
      for (let i = 0; i < 34; i++) {
        const angle = (i / 34) * Math.PI * 2;
        addPoint(Math.cos(angle) * 1.22 * ringRadius, Math.sin(angle) * 0.76 * ringRadius, 0.16, shellHighlight);
      }
    });
    for (let spoke = 0; spoke < 6; spoke++) {
      const angle = (spoke / 6) * Math.PI * 2;
      for (let i = 2; i < 10; i++) {
        const radius = i / 11;
        addPoint(Math.cos(angle) * 1.22 * radius, Math.sin(angle) * 0.76 * radius, 0.16, shellHighlight);
      }
    }

    /* pescoço e cabeça ficam claramente separados do casco */
    for (let i = 0; i < 18; i++) {
      const progress = Math.random();
      addPoint(1.02 + progress * 0.38, rnd(-0.18, 0.18) * (0.7 + progress * 0.3), 0.03, skinDark.clone().lerp(skinLight, progress));
    }
    for (let i = 0; i < 30; i++) {
      const angle = rnd(0, Math.PI * 2);
      const radius = Math.sqrt(Math.random());
      addPoint(1.46 + Math.cos(angle) * 0.32 * radius, Math.sin(angle) * 0.25 * radius, 0.04, skinLight);
    }
    addPoint(1.58, 0.13, 0.11, eye);
    addPoint(1.58, -0.13, 0.11, eye);

    function addFlipper(baseX, baseY, directionX, directionY, length, width, count, flapAmount) {
      const directionLength = Math.hypot(directionX, directionY);
      const dx = directionX / directionLength;
      const dy = directionY / directionLength;
      const px = -dy;
      const py = dx;
      for (let i = 0; i < count; i++) {
        const along = Math.pow(Math.random(), 0.82);
        const envelope = Math.sin(along * Math.PI) * width + (1 - along) * 0.07;
        const across = rnd(-envelope, envelope);
        const color = skinDark.clone().lerp(skinLight, 0.35 + along * 0.42);
        addPoint(
          baseX + dx * length * along + px * across,
          baseY + dy * length * along + py * across,
          0.01,
          color,
          Math.sign(directionY) * along * flapAmount,
        );
      }
    }

    /* dianteiras longas, saindo dos ombros e varrendo para trás */
    addFlipper(0.52, 0.52, -0.42, 0.92, 1.28, 0.27, 46, 0.16);
    addFlipper(0.52, -0.52, -0.42, -0.92, 1.28, 0.27, 46, 0.16);
    /* traseiras menores, alinhadas com a cauda */
    addFlipper(-0.66, 0.43, -0.84, 0.54, 0.75, 0.2, 28, 0.08);
    addFlipper(-0.66, -0.43, -0.84, -0.54, 0.75, 0.2, 28, 0.08);
    for (let i = 0; i < 12; i++) {
      const progress = i / 11;
      addPoint(-1.18 - progress * 0.46, rnd(-0.1, 0.1) * (1 - progress), 0.02, skinDark);
    }

    const start = turtlePositions.length / 3;
    for (let i = 0; i < localX.length; i++) {
      turtlePositions.push(0, 0, 0);
      turtleColors.push(localColors[i * 3], localColors[i * 3 + 1], localColors[i * 3 + 2]);
    }
    turtles.push({
      start,
      count: localX.length,
      localX: new Float32Array(localX),
      localY: new Float32Array(localY),
      localZ: new Float32Array(localZ),
      flap: new Float32Array(flap),
      progress: (turtleIndex / turtleCount + rnd(-0.025, 0.025) + 1) % 1,
      speed: rnd(0.005, 0.008),
      lane: rnd(-2.6, 2.6),
      phase: rnd(0, Math.PI * 2),
    });
  }

  const turtleGeometry = new THREE.BufferGeometry();
  turtleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(turtlePositions), 3));
  turtleGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(turtleColors), 3));
  const turtlePoints = new THREE.Points(turtleGeometry, new THREE.PointsMaterial({
    size: 0.18,
    vertexColors: true,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  }));
  group.add(turtlePoints);

  return {
    group,
    current,
    currentProgress,
    currentLane,
    currentSpeed,
    currentPhase,
    turtlePoints,
    turtles,
    routePoint: {},
  };
}

export function updateMigrationCorridor(migration, time, movementFactor) {
  const route = migration.routePoint;
  const currentPositions = migration.current.geometry.attributes.position.array;
  for (let i = 0; i < migration.currentProgress.length; i++) {
    const progress = (migration.currentProgress[i] + time * migration.currentSpeed[i] * movementFactor) % 1;
    sampleMigrationRoute(progress, route);
    const drift = migration.currentLane[i] + Math.sin(time * 0.55 + migration.currentPhase[i]) * 0.34;
    currentPositions[i * 3] = route.x + route.nx * drift;
    currentPositions[i * 3 + 1] = route.y + route.ny * drift;
    currentPositions[i * 3 + 2] = 0.72 + Math.sin(time * 0.8 + migration.currentPhase[i]) * 0.16;
  }
  migration.current.geometry.attributes.position.needsUpdate = true;

  const turtlePositions = migration.turtlePoints.geometry.attributes.position.array;
  migration.turtles.forEach((turtle) => {
    const progress = (turtle.progress + time * turtle.speed * movementFactor) % 1;
    sampleMigrationRoute(progress, route);
    const flapCycle = Math.sin(time * 1.7 + turtle.phase);
    const centerX = route.x + route.nx * turtle.lane;
    const centerY = route.y + route.ny * turtle.lane;
    for (let i = 0; i < turtle.count; i++) {
      const target = (turtle.start + i) * 3;
      const localY = turtle.localY[i] + flapCycle * turtle.flap[i];
      turtlePositions[target] = centerX + route.tx * turtle.localX[i] + route.nx * localY;
      turtlePositions[target + 1] = centerY + route.ty * turtle.localX[i] + route.ny * localY;
      turtlePositions[target + 2] = 1.45 + turtle.localZ[i] + Math.sin(time * 0.45 + turtle.phase) * 0.12;
    }
  });
  migration.turtlePoints.geometry.attributes.position.needsUpdate = true;
}
