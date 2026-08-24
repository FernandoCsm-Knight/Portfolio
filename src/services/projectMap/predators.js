import * as THREE from 'three';
import { rnd } from '../ocean/utils';
import { optimizeParticleGeometry } from '../ocean/particleBudget';
import { construirBaleiaOrganica } from '../ocean/creatureBuilders';
import { M_BALEIA } from '../ocean/creatureConfigs';
import { SHARK_PATROLS, WHALE_PATROLS } from './constants';

export function makeSharks() {
  const backC = new THREE.Color('#153f46');
  const bellyC = new THREE.Color('#9ccfc7');
  const finC = new THREE.Color('#0d2b32');

  const bodyBaseList = [];
  const bodyColorList = [];
  const bodySwayPhaseList = [];
  const bodySwayAmpList = [];
  const finBaseList = [];
  const finColorList = [];
  const finTailPowerList = [];
  const sharkMeta = [];

  SHARK_PATROLS.forEach((patrol) => {
    const body = [];
    const bodyCols = [];
    const fin = [];
    const finCols = [];

    function putBody(x, y, z, c) {
      body.push(x, y, z);
      bodyCols.push(c.r, c.g, c.b);
    }

    function putFin(x, y, z, c) {
      fin.push(x, y, z);
      finCols.push(c.r, c.g, c.b);
    }

    for (let i = 0; i < 88; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.58);
      const x = Math.cos(a) * r * 1.55;
      const y = Math.sin(a) * r * 0.38;
      const c = y < -0.03 ? bellyC.clone().lerp(backC, 0.18) : backC.clone().lerp(bellyC, 0.08);
      putBody(x, y, rnd(1.7, 2.18), c);
    }

    for (let i = 0; i < 30; i++) {
      const t = Math.random();
      const x = 1.15 + t * 0.9;
      const y = rnd(-0.22, 0.22) * (1 - t * 0.7);
      putBody(x, y, rnd(1.8, 2.22), bellyC.clone().lerp(backC, t * 0.36));
    }

    for (let i = 0; i < 34; i++) {
      const u = Math.pow(Math.random(), 0.7);
      const side = Math.random() > 0.5 ? 1 : -1;
      putFin(-1.45 - u * 0.85, side * u * 0.42 + rnd(-0.04, 0.04), rnd(1.72, 2.08), finC);
    }

    for (let i = 0; i < 22; i++) {
      const u = Math.pow(Math.random(), 0.68);
      putFin(-0.08 - u * 0.38, 0.32 + u * 0.72, rnd(1.9, 2.28), finC.clone().lerp(backC, 0.15));
    }

    for (let i = 0; i < 18; i++) {
      const u = Math.pow(Math.random(), 0.75);
      putFin(0.08 - u * 0.42, -0.26 - u * 0.54, rnd(1.68, 2.02), finC.clone().lerp(bellyC, 0.12));
    }

    const bodyGeomRaw = new THREE.BufferGeometry();
    bodyGeomRaw.setAttribute('position', new THREE.BufferAttribute(new Float32Array(body), 3));
    bodyGeomRaw.setAttribute('color', new THREE.BufferAttribute(new Float32Array(bodyCols), 3));
    const optimizedBody = optimizeParticleGeometry(bodyGeomRaw, new Float32Array(body), {
      density: 62,
      minParticles: 58,
      importance: 1.16,
    });
    const finGeomRaw = new THREE.BufferGeometry();
    finGeomRaw.setAttribute('position', new THREE.BufferAttribute(new Float32Array(fin), 3));
    finGeomRaw.setAttribute('color', new THREE.BufferAttribute(new Float32Array(finCols), 3));
    const optimizedFin = optimizeParticleGeometry(finGeomRaw, new Float32Array(fin), {
      density: 42,
      minParticles: 30,
      importance: 0.92,
    });

    /* opacidade por tubarão (min(0.94, opacidadeBase*brightness), antes por
       material) vira multiplicador de cor — equivalente sob AdditiveBlending. */
    const phase = rnd(0, Math.PI * 2);
    const bBase = optimizedBody.base;
    const bColors = optimizedBody.geometry.attributes.color.array;
    const bN = bBase.length / 3;
    const colorScaleBody = Math.min(0.94 / 0.72, optimizedBody.brightness);
    const bodyStart = bodyBaseList.length / 3;
    for (let i = 0, j = 0; i < bN; i++, j += 3) {
      const bx = bBase[j];
      bodyBaseList.push(bBase[j], bBase[j + 1], bBase[j + 2]);
      bodyColorList.push(bColors[j] * colorScaleBody, bColors[j + 1] * colorScaleBody, bColors[j + 2] * colorScaleBody);
      bodySwayPhaseList.push(bx * 1.4 + phase);
      bodySwayAmpList.push(Math.max(0, -bx) * 0.028);
    }

    const fBase = optimizedFin.base;
    const fColors = optimizedFin.geometry.attributes.color.array;
    const fN = fBase.length / 3;
    const colorScaleFin = Math.min(0.94 / 0.74, optimizedFin.brightness);
    const finStart = finBaseList.length / 3;
    for (let i = 0, j = 0; i < fN; i++, j += 3) {
      const bx = fBase[j];
      finBaseList.push(fBase[j], fBase[j + 1], fBase[j + 2]);
      finColorList.push(fColors[j] * colorScaleFin, fColors[j + 1] * colorScaleFin, fColors[j + 2] * colorScaleFin);
      finTailPowerList.push(bx < -1.3 ? Math.abs(bx + 1.3) * 0.2 : 0.035);
    }

    sharkMeta.push({ patrol, phase, bodyStart, bodyCount: bN, finStart, finCount: fN });
  });

  const bodyBase = new Float32Array(bodyBaseList);
  const bodyGeometry = new THREE.BufferGeometry();
  bodyGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bodyBase.length), 3));
  bodyGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(bodyColorList), 3));
  const bodyObj = new THREE.Points(bodyGeometry, new THREE.PointsMaterial({
    size: 0.17, vertexColors: true, transparent: true, opacity: 0.72,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));

  const finBase = new Float32Array(finBaseList);
  const finGeometry = new THREE.BufferGeometry();
  finGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(finBase.length), 3));
  finGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(finColorList), 3));
  const finObj = new THREE.Points(finGeometry, new THREE.PointsMaterial({
    size: 0.15, vertexColors: true, transparent: true, opacity: 0.74,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));

  return {
    bodyObj,
    finObj,
    bodyBase,
    finBase,
    bodySwayPhase: new Float32Array(bodySwayPhaseList),
    bodySwayAmp: new Float32Array(bodySwayAmpList),
    finTailPower: new Float32Array(finTailPowerList),
    sharks: sharkMeta,
  };
}

export function makeWhales() {
  const group = new THREE.Group();
  const whales = WHALE_PATROLS.map((patrol) => {
    const built = construirBaleiaOrganica(M_BALEIA.baleia, patrol.scale);
    const optimized = optimizeParticleGeometry(built.geo, built.base, {
      density: 58,
      minParticles: 190,
      importance: 1.3,
    });
    const base = optimized.base;
    const colors = optimized.geometry.attributes.color.array;
    const brightness = Math.min(1.18, optimized.brightness);
    for (let i = 0; i < colors.length; i++) colors[i] *= brightness;

    const object = new THREE.Points(optimized.geometry, new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }));
    group.add(object);

    const count = base.length / 3;
    const wavePhaseY = new Float32Array(count);
    const waveAmpY = new Float32Array(count);
    const wavePhaseZ = new Float32Array(count);
    const waveAmpZ = new Float32Array(count);
    const phase = rnd(0, Math.PI * 2);
    const tailStart = -M_BALEIA.baleia.len * 0.42 * patrol.scale;
    for (let i = 0, j = 0; i < count; i++, j += 3) {
      const bx = base[j];
      const by = base[j + 1];
      const tail = bx < tailStart ? tailStart - bx : 0;
      wavePhaseY[i] = phase + bx * 0.9;
      waveAmpY[i] = 0.012 + tail * 0.09;
      wavePhaseZ[i] = phase + bx * 0.42 + Math.abs(by) * 0.55;
      waveAmpZ[i] = 0.014 + Math.min(0.035, Math.abs(base[j + 2]) * 0.035);
    }

    return { object, patrol, base, phase, wavePhaseY, waveAmpY, wavePhaseZ, waveAmpZ };
  });
  return { group, whales };
}
