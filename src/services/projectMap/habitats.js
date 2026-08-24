import * as THREE from 'three';
import { rnd } from '../ocean/utils';
import { makePoints } from './utils';

export function makeDetailedThemeModel(field, theme) {
  const particles = [];
  const colors = [];
  const glows = [];
  const glowColors = [];
  const darkInk = new THREE.Color('#1a110b');

  function put(x, y, z, color, glow = false) {
    const target = glow ? glows : particles;
    const palette = glow ? glowColors : colors;
    target.push(field.cx + x, field.cy + y, z);
    palette.push(color.r, color.g, color.b);
  }

  function dotCluster(cx, cy, rx, ry, count, colorA, colorB, z = 1.14) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.55);
      const color = colorA.clone().lerp(colorB, Math.random());
      put(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, z + rnd(-0.04, 0.1), color);
    }
  }

  if (theme === 'canyon') {
    const deep = new THREE.Color('#120d09');
    const rock = new THREE.Color('#3d3022');
    const edge = new THREE.Color('#1b6868');
    const moss = new THREE.Color('#498b78');
    for (let side = -1; side <= 1; side += 2) {
      for (let column = 0; column < 48; column++) {
        const t = column / 47;
        const x = (t - 0.5) * field.rx * 1.56;
        const bend = Math.sin(t * Math.PI * 2.4 + 0.4) * 0.48;
        const edgeY = side * field.ry * (0.25 + Math.sin(t * Math.PI) * 0.1) + bend;
        for (let layer = 0; layer < 7; layer++) {
          const distance = layer * field.ry * 0.075;
          const c = rock.clone().lerp(deep, layer / 7).lerp(moss, Math.random() * 0.16);
          put(x + rnd(-0.16, 0.16), edgeY + side * distance + rnd(-0.15, 0.15), 1.08 + layer * 0.026, c);
        }
        if (column % 2 === 0) put(x, edgeY, 1.34, edge.clone().lerp(moss, Math.random() * 0.35), true);
      }
    }
    for (let i = 0; i < 180; i++) {
      const t = Math.random();
      const x = (t - 0.5) * field.rx * 1.4;
      const center = Math.sin(t * Math.PI * 2.4 + 0.4) * 0.48;
      put(x, center + rnd(-field.ry * 0.15, field.ry * 0.15), 1.02, deep.clone().lerp(rock, Math.random() * 0.18));
    }
  }

  if (theme === 'wreck') {
    const wood = new THREE.Color('#5a3a20');
    const darkWood = new THREE.Color('#2a1a0e');
    const rust = new THREE.Color('#a9512d');
    const brass = new THREE.Color('#dcae5f');
    const algae = new THREE.Color('#2f7d76');
    const rotation = -0.16;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    function shipPoint(x, y, z, color, glow = false) {
      put(x * cos - y * sin, x * sin + y * cos, z, color, glow);
    }

    const hullLen = field.rx * 0.92;
    const hullH = field.ry * 0.52;
    function deckY(t) {
      const bow = Math.pow(Math.min(1, t / 0.16), 0.5);
      const stern = t > 0.86 ? Math.max(0.3, 1 - (t - 0.86) * 3.4) : 1;
      return hullH * bow * stern;
    }
    function keelY(t) {
      return -deckY(t) * 0.6;
    }

    for (let i = 0; i < 160; i++) {
      const t = i / 159;
      const x = -hullLen * 0.5 + t * hullLen;
      shipPoint(x, deckY(t) + rnd(-0.05, 0.05), 1.22, wood.clone().lerp(brass, 0.15 + t * 0.1));
      shipPoint(x, keelY(t) + rnd(-0.05, 0.05), 1.16, darkWood);
    }
    for (let i = 0; i < 220; i++) {
      const t = Math.random();
      const x = -hullLen * 0.5 + t * hullLen;
      const y = rnd(keelY(t), deckY(t));
      shipPoint(x, y, 1.14, wood.clone().lerp(darkWood, Math.random() * 0.5));
    }
    for (let rib = 0; rib < 9; rib++) {
      const t = 0.08 + (rib / 8) * 0.76;
      const x = -hullLen * 0.5 + t * hullLen;
      const top = deckY(t);
      const bottom = keelY(t);
      for (let p = 0; p < 9; p++) {
        const u = p / 8;
        shipPoint(x, bottom + u * (top - bottom), 1.26, rib % 3 ? rust : darkWood);
      }
    }

    const mastX = -hullLen * 0.06;
    const mastBaseY = deckY(0.44);
    const mastTipX = mastX + 0.6;
    const mastTipY = mastBaseY + hullH * 2.5;
    for (let p = 0; p < 30; p++) {
      const t = p / 29;
      shipPoint(mastX + t * (mastTipX - mastX), mastBaseY + t * (mastTipY - mastBaseY), 1.3, darkWood);
    }
    for (let p = 0; p < 60; p++) {
      const u = Math.pow(Math.random(), 0.6);
      const v = Math.random();
      shipPoint(mastX + 0.12 + u * 1.2 * v, mastBaseY + hullH * 0.4 + u * hullH * 2, 1.28, brass.clone().lerp(darkWood, u * 0.55), Math.random() > 0.8);
    }

    for (let p = 0; p < 46; p++) {
      const a = Math.random() * Math.PI * 2;
      const r = (0.6 + Math.pow(Math.random(), 0.6) * 0.4) * field.rx * 0.7;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.5;
      put(x, y, 1.1, p % 6 === 0 ? brass : wood, p % 9 === 0);
    }
    for (let p = 0; p < 40; p++) {
      const x = rnd(-field.rx * 0.55, field.rx * 0.55);
      const y = rnd(-field.ry * 0.36, field.ry * 0.36);
      if (Math.random() > 0.5) put(x, y, 1.31, algae, true);
    }
  }

  if (theme === 'reef') {
    const corals = [new THREE.Color('#eb6a3e'), new THREE.Color('#e94974'), new THREE.Color('#ffb34f'), new THREE.Color('#29b2a3')];
    const pale = new THREE.Color('#a8ead5');
    const reefRock = new THREE.Color('#235e57');
    for (let colony = 0; colony < 17; colony++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 0.78;
      const cx = Math.cos(a) * field.rx * r;
      const cy = Math.sin(a) * field.ry * r;
      const coral = corals[colony % corals.length];
      dotCluster(cx, cy, rnd(0.32, 0.72), rnd(0.22, 0.52), 18, reefRock, coral, 1.12);
      const branches = 4 + (colony % 3);
      for (let branch = 0; branch < branches; branch++) {
        const direction = (branch / branches) * Math.PI * 2 + rnd(-0.2, 0.2);
        const length = rnd(0.42, 1.0);
        for (let p = 0; p < 8; p++) {
          const t = p / 7;
          put(cx + Math.cos(direction) * length * t, cy + Math.sin(direction) * length * t, 1.2 + t * 0.08, coral.clone().lerp(pale, t * 0.24));
          if (p > 3 && p % 2 === 0) put(cx + Math.cos(direction) * length * t, cy + Math.sin(direction) * length * t, 1.36, pale, true);
        }
      }
    }
    for (let fish = 0; fish < 34; fish++) {
      const x = rnd(-field.rx * 0.78, field.rx * 0.78);
      const y = rnd(field.ry * 0.12, field.ry * 0.78);
      const fishColor = fish % 3 ? new THREE.Color('#e9b34e') : new THREE.Color('#55d2c2');
      put(x, y, 1.44, fishColor, true);
      put(x - 0.17, y + 0.08, 1.42, fishColor);
      put(x - 0.17, y - 0.08, 1.42, fishColor);
    }
  }

  if (theme === 'cave') {
    const black = new THREE.Color('#0d0c0b');
    const stone = new THREE.Color('#30271e');
    const rim = new THREE.Color('#236462');
    const light = new THREE.Color('#a7e4d5');
    for (let i = 0; i < 520; i++) {
      const a = Math.random() * Math.PI * 2;
      const mouth = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)));
      const radius = 0.4 + Math.pow(Math.random(), 0.55) * 0.45;
      if (mouth < 0.42 && radius > 0.55) continue;
      const x = Math.cos(a) * field.rx * radius;
      const y = Math.sin(a) * field.ry * radius;
      put(x, y, 1.1 + radius * 0.12, stone.clone().lerp(black, Math.random() * 0.64));
      if (radius > 0.72 && i % 6 === 0) put(x, y, 1.34, rim, true);
    }
    dotCluster(0, -field.ry * 0.05, field.rx * 0.35, field.ry * 0.32, 120, black, darkInk, 1.08);
    for (let ray = -3; ray <= 3; ray++) {
      for (let p = 0; p < 17; p++) {
        const t = p / 16;
        put(ray * 0.22 * (1 - t), field.ry * 0.78 - t * field.ry * 0.9, 1.38, light.clone().lerp(rim, t * 0.55), true);
      }
    }
  }

  const base = makePoints(particles, colors, 0.2, 0.88, THREE.NormalBlending);
  const glow = makePoints(glows, glowColors, 0.17, 0.8, THREE.AdditiveBlending);
  const group = new THREE.Group();
  group.add(base, glow);
  group.userData = { theme, phase: rnd(0, Math.PI * 2), particleLayers: [base, glow] };
  return group;
}

export function makeSunkenTreasure(surfaceZ) {
  const group = new THREE.Group();
  const goldPoints = [];
  const goldColors = [];
  const sparklePoints = [];
  const sparkleColors = [];
  const rubyPoints = [];
  const rubyColors = [];
  const goldDark = new THREE.Color('#8f6418');
  const gold = new THREE.Color('#d5a52f');
  const brightGold = new THREE.Color('#ffe39a');
  const rubyDark = new THREE.Color('#7f1026');
  const ruby = new THREE.Color('#e5394f');
  const rubyLight = new THREE.Color('#ff7180');
  const diamond = new THREE.Color('#a9f2ee');
  const diamondBlue = new THREE.Color('#48aeca');

  function put(target, palette, x, y, z, color) {
    target.push(x, y, z);
    palette.push(color.r, color.g, color.b);
  }
  function putGold(x, y, z, color) {
    put(goldPoints, goldColors, x, y, z, color);
  }
  function putSparkle(x, y, z, color) {
    put(sparklePoints, sparkleColors, x, y, z, color);
  }
  function putRuby(x, y, z, color) {
    put(rubyPoints, rubyColors, x, y, z, color);
  }

  /* Campos sobrepostos formam uma única mancha comprida. Usar o máximo e
     parte da soma evita tanto elipses visíveis quanto vazios entre montes. */
  const deposits = [
    { x: -2.2, y: 0.1, rx: 6.8, ry: 4.8, strength: 1 },
    { x: 3.1, y: 0.85, rx: 7.9, ry: 4.15, strength: 0.98 },
    { x: 8.7, y: -0.55, rx: 7.7, ry: 3.75, strength: 0.88 },
    { x: 14.2, y: 0.35, rx: 6.6, ry: 3.2, strength: 0.72 },
    { x: 18.7, y: -0.25, rx: 4.7, ry: 2.45, strength: 0.48 },
  ];

  function depositDensity(x, y) {
    let strongest = 0;
    let combined = 0;
    deposits.forEach((deposit, index) => {
      const dx = (x - deposit.x) / deposit.rx;
      const dy = (y - deposit.y) / deposit.ry;
      const distance = dx * dx + dy * dy;
      const organicEdge =
        Math.sin(x * 0.73 + index * 1.9) * 0.1 +
        Math.cos(y * 1.17 - index) * 0.075 +
        Math.sin((x + y) * 1.61) * 0.045;
      const value = Math.max(0, 1 - distance + organicEdge) * deposit.strength;
      strongest = Math.max(strongest, value);
      combined += value;
    });
    return Math.min(1, strongest + combined * 0.16);
  }

  /* Amostragem por densidade: centro compacto, borda dissolvida e extensão
     contínua para a direita, como ouro espalhado sobre o fundo do mar. */
  let accepted = 0;
  let attempts = 0;
  while (accepted < 4400 && attempts < 22000) {
    attempts++;
    const x = rnd(-9.2, 24.2);
    const y = rnd(-6.2, 6.1);
    const density = depositDensity(x, y);
    if (density < 0.055 || Math.random() > Math.pow(density, 0.72) * 0.94) continue;

    const relief =
      Math.sin(x * 0.69) * Math.cos(y * 0.91) * 0.055 +
      Math.sin((x - y) * 1.34) * 0.025;
    const z = 0.08 + Math.pow(density, 1.28) * 0.58 + relief + rnd(-0.035, 0.055);
    const shade = THREE.MathUtils.clamp(0.18 + density * 0.54 + Math.random() * 0.32, 0, 1);
    const color = goldDark.clone().lerp(gold, Math.min(1, shade * 1.35)).lerp(brightGold, Math.max(0, shade - 0.54));
    putGold(x + rnd(-0.08, 0.08), y + rnd(-0.07, 0.07), z, color);
    if (Math.random() < 0.055 + density * 0.045) {
      putSparkle(x, y, z + rnd(0.06, 0.16), brightGold);
    }
    accepted++;
  }

  /* Rubis maiores usam uma camada opaca própria para o vermelho não se perder
     na mistura aditiva dos brilhos dourados. */
  let placedRubies = 0;
  let rubyAttempts = 0;
  while (placedRubies < 18 && rubyAttempts < 180) {
    rubyAttempts++;
    const x = rnd(-6.2, 20.5);
    const y = rnd(-3.7, 3.7);
    const density = depositDensity(x, y);
    if (density < 0.3 || Math.random() > density) continue;
    const size = rnd(0.2, 0.29);
    const z = 0.5 + density * 0.2;
    putRuby(x, y + size, z, rubyDark);
    putRuby(x + size, y, z + 0.02, ruby);
    putRuby(x, y - size, z, rubyDark);
    putRuby(x - size, y, z + 0.02, ruby);
    putRuby(x, y, z + 0.1, rubyLight);
    placedRubies++;
  }

  /* Diamantes permanecem integrados ao campo, sem formar baús. */
  for (let i = 0; i < 16; i++) {
    const x = rnd(-5.5, 18.5);
    const y = rnd(-3.5, 3.5);
    const density = depositDensity(x, y);
    if (density < 0.28) continue;
    const size = rnd(0.16, 0.24);
    putSparkle(x, y + size, 0.5, diamondBlue);
    putSparkle(x + size, y, 0.46, diamond);
    putSparkle(x, y - size, 0.5, diamondBlue);
    putSparkle(x - size, y, 0.46, diamond);
    putSparkle(x, y, 0.57, diamond);
  }

  const treasure = makePoints(goldPoints, goldColors, 0.2, 0.96, THREE.NormalBlending);
  const sparkles = makePoints(sparklePoints, sparkleColors, 0.15, 0.88, THREE.AdditiveBlending);
  const rubies = makePoints(rubyPoints, rubyColors, 0.23, 1, THREE.NormalBlending);
  group.add(treasure, sparkles, rubies);
  group.position.z = surfaceZ + 0.05;
  group.userData = { treasure, sparkles, phase: rnd(0, Math.PI * 2) };
  return group;
}
