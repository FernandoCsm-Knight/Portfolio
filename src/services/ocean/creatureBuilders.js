import * as THREE from 'three';
import { rnd } from './utils';

/* ============ CONSTRUTORES ORGÂNICOS ============ */
/* Cada função gera uma nuvem de partículas (posição + cor) para um tipo de
   criatura/objeto. São funções puras: recebem uma config e uma escala e
   devolvem a geometria pronta para virar um THREE.Points. */

export function construirPeixeOrganico(cfg, escala) {
  const bodyCount = cfg.bodyCount || 230;
  const tailCount = cfg.tailCount || 54;
  const finCount = cfg.finCount || 38;
  const lureCount = cfg.lure ? 34 : 0;
  const n = bodyCount + tailCount + finCount + lureCount;
  const pos = new Float32Array(n * 3), base = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const bodyC = new THREE.Color(cfg.body);
  const spotC = new THREE.Color(cfg.spot || cfg.body);
  const tailC = new THREE.Color(cfg.tail || cfg.body).lerp(new THREE.Color('#f6ead2'), cfg.tailWarm ?? 0.12);
  const shadeC = bodyC.clone().lerp(new THREE.Color(cfg.deep || '#07151e'), cfg.shade ?? 0.38);
  const pearlC = bodyC.clone().lerp(new THREE.Color('#ffffff'), cfg.pearl ?? 0.18);
  const glowC = new THREE.Color(cfg.glow || '#5ae8b8');
  const darkC = bodyC.clone().lerp(new THREE.Color('#02080c'), 0.45);
  const len = cfg.len || 6.2;
  const thick = cfg.thick || 0.92;
  const depth = cfg.depth || 0.42;
  const seed = rnd(0, 100);
  let k = 0;

  function put(x, y, z, c) {
    base[k * 3] = pos[k * 3] = x * escala;
    base[k * 3 + 1] = pos[k * 3 + 1] = y * escala;
    base[k * 3 + 2] = pos[k * 3 + 2] = z * escala;
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    k++;
  }

  for (let i = 0; i < bodyCount; i++) {
    const x = -len * 0.45 + Math.random() * len;
    const norm = (x - len * 0.05) / (len * 0.52);
    const taper = Math.max(0.05, Math.pow(Math.max(0, 1 - norm * norm), 0.55) * thick);
    const y = (Math.random() * 2 - 1) * taper * (0.72 + Math.random() * 0.24);
    const side = Math.random() * 2 - 1;
    const z = side * taper * depth * (0.35 + Math.random() * 0.65);
    const band = Math.sin(x * 1.75 + seed) + Math.cos(y * 4.2 - seed * 0.3);
    const dorsal = y > taper * 0.48;
    const belly = y < -taper * 0.52 || side < -0.52;
    const spot = (cfg.spot && band > cfg.spotCut && Math.abs(y) < taper * 0.75) ||
      (cfg.koi && ((x > 0.65 && x < 1.75 && y > -0.25) || (x > -1.3 && x < -0.25 && y < 0.38) || (x > 2.1 && Math.abs(y) < 0.42)));
    let c = bodyC;
    if (cfg.glow && Math.random() > 0.9) c = Math.random() > 0.45 ? glowC : glowC.clone().lerp(pearlC, 0.35);
    else if (spot && Math.random() > 0.18) c = spotC;
    else if (dorsal) c = pearlC;
    else if (belly) c = shadeC;
    put(x, y, z, c);
  }

  for (let i = 0; i < tailCount; i++) {
    const t = Math.random();
    const split = Math.random() > 0.5 ? 1 : -1;
    const x = -len * 0.48 - t * (cfg.tailLen || 1.8);
    const y = split * (t * (cfg.tailFan || 0.82) + 0.08) * (Math.random() * 0.85 + 0.15);
    const z = (Math.random() * 2 - 1) * (0.07 + t * 0.18);
    put(x, y, z, tailC);
  }

  for (let i = 0; i < finCount; i++) {
    const top = i % 2 ? 1 : -1;
    const x = -len * 0.1 + Math.random() * len * 0.45;
    const y = top * (thick * 0.68 + Math.random() * (cfg.finReach || 0.58));
    const z = (Math.random() * 2 - 1) * 0.16;
    put(x, y, z, cfg.darkFin ? darkC : tailC.clone().lerp(shadeC, 0.25));
  }

  if (cfg.lure) {
    for (let i = 0; i < lureCount; i++) {
      const t = i / (lureCount - 1);
      const x = len * 0.28 + Math.sin(t * Math.PI) * 0.8;
      const y = thick * 0.65 + t * 1.9;
      const z = Math.sin(t * 5) * 0.06;
      put(x, y, z, t > 0.82 ? glowC : shadeC);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return { geo, base, n };
}

export function construirCoralOrganico(cfg, escala) {
  const branches = cfg.branches || 7;
  const segments = cfg.segments || 13;
  const crown = cfg.crown || 4;
  const n = branches * segments * crown;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const baseC = new THREE.Color(cfg.base || '#466984');
  const tipC = new THREE.Color(cfg.tip || '#7fe3d0');
  const shadeC = baseC.clone().lerp(new THREE.Color('#061018'), 0.45);
  const height = cfg.height || 6;
  const spread = cfg.spread || 4.5;
  let k = 0;

  for (let b = 0; b < branches; b++) {
    const side = b / (branches - 1) - 0.5;
    const phase = rnd(0, Math.PI * 2);
    const lean = side * spread + rnd(-0.45, 0.45);
    const length = height * rnd(0.65, 1.08);
    for (let s = 0; s < segments; s++) {
      const t = s / (segments - 1);
      const bend = Math.sin(t * Math.PI) * lean + Math.sin(t * 4.2 + phase) * 0.35;
      const centerX = bend;
      const centerY = t * length;
      const centerZ = Math.cos(t * 3.4 + phase) * 0.32 + side * 0.5;
      const radius = Math.max(0.06, (0.42 * (1 - t) + 0.08) * cfg.thick);
      const cc = shadeC.clone().lerp(tipC, Math.pow(t, 0.85)).lerp(baseC, 0.25 * Math.sin(phase + b));
      for (let q = 0; q < crown; q++) {
        const a = (q / crown) * Math.PI * 2 + phase + s * 0.7;
        pos[k * 3] = (centerX + Math.cos(a) * radius * rnd(0.2, 1.1)) * escala;
        pos[k * 3 + 1] = centerY * escala;
        pos[k * 3 + 2] = (centerZ + Math.sin(a) * radius * 0.55) * escala;
        col[k * 3] = cc.r; col[k * 3 + 1] = cc.g; col[k * 3 + 2] = cc.b;
        k++;
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return { geo, n };
}

export function construirCaranguejoOrganico(cfg, escala) {
  const bodyCount = cfg.bodyCount || 96;
  const n = bodyCount + 18 + 2 * (20 + 18 + 4 * 15 + 6);
  const pos = new Float32Array(n * 3), base = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const shellC = new THREE.Color(cfg.shell || '#7a4a3a');
  const edgeC = new THREE.Color(cfg.edge || '#c69749');
  const darkC = shellC.clone().lerp(new THREE.Color('#02080c'), 0.44);
  const pearlC = new THREE.Color('#e7d3a8');
  let k = 0;

  function put(x, y, z, c) {
    base[k * 3] = pos[k * 3] = x * escala;
    base[k * 3 + 1] = pos[k * 3 + 1] = y * escala;
    base[k * 3 + 2] = pos[k * 3 + 2] = z * escala;
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    k++;
  }

  for (let i = 0; i < bodyCount; i++) {
    const x = rnd(-1.35, 1.35);
    const half = Math.max(0.08, Math.sqrt(Math.max(0, 1 - (x / 1.48) * (x / 1.48))) * 0.62);
    const y = 0.2 + rnd(-half, half);
    const rim = Math.abs(y - 0.2) > half * 0.68 || Math.abs(x) > 1.08;
    const face = y > 0.28 && Math.abs(x) < 0.78;
    const belly = y < -0.18 && Math.abs(x) < 0.55;
    const z = rnd(-0.025, 0.04) + (face ? 0.035 : 0);
    put(x, y, z, belly ? darkC : (rim ? edgeC : (face ? shellC.clone().lerp(edgeC, 0.28) : shellC)));
  }

  // avental central escuro, como na referência do caranguejo de frente
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const x = rnd(-0.38, 0.38) * (1 - t * 0.55);
    const y = -0.34 - t * 0.62 + rnd(-0.04, 0.04);
    put(x, y, rnd(-0.015, 0.02), darkC);
  }

  for (let side = -1; side <= 1; side += 2) {
    // braços e pinças erguidos, espelhados esquerda/direita
    for (let s = 0; s < 20; s++) {
      const t = s / 19;
      const x = side * (1.02 + t * 1.55);
      const y = -0.04 + Math.sin(t * Math.PI) * 0.24 + t * 0.06;
      const z = rnd(-0.018, 0.035);
      put(x, y, z, t > 0.68 ? edgeC : shellC);
    }
    for (let prong = -1; prong <= 1; prong += 2) {
      for (let s = 0; s < 9; s++) {
        const t = s / 8;
        const x = side * (2.42 + t * 0.76 + Math.sin(t * Math.PI) * 0.08);
        const y = 0.12 + prong * (0.04 + t * 0.18) + Math.sin(t * Math.PI) * 0.06;
        put(x, y, rnd(-0.015, 0.03), t > 0.58 ? edgeC : shellC);
      }
    }

    // pernas descendo até o leito
    for (let leg = 0; leg < 4; leg++) {
      const anchorX = side * (0.42 + leg * 0.25);
      const anchorY = -0.24 - leg * 0.03;
      for (let s = 0; s < 15; s++) {
        const t = s / 14;
        const knee = Math.sin(t * Math.PI) * side * (0.2 + leg * 0.04);
        const x = anchorX + side * t * (0.42 + leg * 0.18) + knee;
        const y = anchorY - t * (0.82 + leg * 0.12);
        const z = rnd(-0.02, 0.018) - t * 0.018;
        put(x, y, z, t > 0.78 ? edgeC : shellC.clone().lerp(darkC, 0.26));
      }
    }

    // olhos em haste no topo da carapaça
    for (let s = 0; s < 6; s++) {
      const t = s / 5;
      const x = side * (0.32 + t * 0.08);
      const y = 0.78 + t * 0.34;
      put(x, y, 0.04 + t * 0.06, s > 3 ? pearlC : darkC);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return { geo, base, n };
}

export function texBrilho(cor) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, cor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
