import * as THREE from 'three';
import { rnd } from '../ocean/utils';
import { disposeSceneResources, getWebGLPixelRatio, precompileRenderer } from '../ocean/webglUtils';
import { makeKelpForest } from './kelp';

/* Deslocamento total da câmera entre o topo e o fim da página. Bem menor que
   o PROF da home (150): aqui a descida é um acompanhamento discreto da
   leitura, não o eixo da experiência. */
const DESCIDA = 46;
const POEIRA = 420;
const RAIOS = 6;

/** Feixe de luz: um cone suave que some para baixo, desenhado uma vez e
 *  compartilhado por todos os raios. */
function texturaRaio() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradiente = ctx.createLinearGradient(0, 0, 0, 256);
  gradiente.addColorStop(0, 'rgba(231,211,168,.34)');
  gradiente.addColorStop(0.3, 'rgba(127,227,208,.13)');
  gradiente.addColorStop(1, 'rgba(127,227,208,0)');
  ctx.fillStyle = gradiente;
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.bezierCurveTo(36, 44, 42, 110, 52, 256);
  ctx.lineTo(16, 256);
  ctx.bezierCurveTo(24, 132, 18, 52, 26, 0);
  ctx.closePath();
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

/**
 * Cena de fundo da página "sobre": poeira em suspensão e alguns feixes de luz.
 * Deliberadamente sem criaturas, cardumes, leito nem bolhas — a página é para
 * ler, e o custo por frame precisa ser uma fração do da home.
 */
export function createAboutScene(canvas, { reducedMotion = false } = {}) {
  const fMov = reducedMotion ? 0.3 : 1;

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, stencil: false, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(getWebGLPixelRatio(window.innerWidth));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 260);
  cam.position.set(0, 0, 52);

  /* — poeira em suspensão — */
  const posicoes = new Float32Array(POEIRA * 3);
  const base = new Float32Array(POEIRA * 3);
  const fase = new Float32Array(POEIRA);
  for (let i = 0; i < POEIRA; i++) {
    const idx = i * 3;
    base[idx] = posicoes[idx] = rnd(-70, 70);
    base[idx + 1] = posicoes[idx + 1] = rnd(14, -DESCIDA - 24);
    base[idx + 2] = posicoes[idx + 2] = rnd(-20, 12);
    fase[i] = rnd(0, Math.PI * 2);
  }
  const geoPoeira = new THREE.BufferGeometry();
  geoPoeira.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
  const matPoeira = new THREE.PointsMaterial({
    color: 0x7fe3d0,
    size: 0.26,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(geoPoeira, matPoeira));

  /* — floresta de kelp — */
  const kelp = makeKelpForest();
  scene.add(kelp.objeto);

  /* — feixes de luz —
     A origem fica acima do topo da janela: com a câmera em z=52 e fov 50°, o
     plano dos feixes (z entre -24 e -8) aparece até y ≈ +35 no início da
     rolagem. Nascendo em y 38–56, o começo do feixe nunca entra em quadro e a
     luz parece descer da superfície, em vez de acender no meio da água. O
     comprimento acompanha: precisa alcançar y ≈ -82, o ponto mais fundo que a
     câmera enxerga no fim da página. */
  const raios = [];
  const texRaio = texturaRaio();
  for (let i = 0; i < RAIOS; i++) {
    const altura = rnd(150, 210);
    const largura = rnd(8, 20);
    const geometria = new THREE.PlaneGeometry(largura, altura);
    /* origem no topo do feixe, para a posição marcar de onde a luz vem */
    geometria.translate(0, -altura * 0.5, 0);
    const malha = new THREE.Mesh(geometria, new THREE.MeshBasicMaterial({
      map: texRaio,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: rnd(0.16, 0.3),
    }));
    malha.position.set(rnd(-56, 56), rnd(38, 56), rnd(-24, -8));
    malha.rotation.z = rnd(-0.3, -0.08);
    malha.userData = {
      baseX: malha.position.x,
      baseY: malha.position.y,
      baseRot: malha.rotation.z,
      baseOp: malha.material.opacity,
      deriva: rnd(0.16, 0.42),
      fase: rnd(0, Math.PI * 2),
    };
    scene.add(malha);
    raios.push(malha);
  }

  let alvoY = 0;
  let camY = 0;
  const ponteiro = { nx: 0, ny: 0 };
  let ultimoInstante = performance.now();
  let decorrido = 0;

  function resize(largura, altura) {
    renderer.setPixelRatio(getWebGLPixelRatio(largura));
    renderer.setSize(largura, altura);
    cam.aspect = largura / altura;
    cam.updateProjectionMatrix();
  }

  function setPointerNDC(nx, ny) {
    ponteiro.nx = nx;
    ponteiro.ny = ny;
  }

  function setScrollProgress(progresso) {
    alvoY = -progresso * DESCIDA;
  }

  function update() {
    const agora = performance.now();
    const dt = Math.min((agora - ultimoInstante) / 1000, 0.05);
    ultimoInstante = agora;
    decorrido += dt;
    const t = decorrido;

    camY += (alvoY - camY) * Math.min(1, dt * 3.2);
    const prof = Math.min(1, Math.max(0, -camY / DESCIDA));
    const paralaxe = (1 - prof * 0.45) * fMov;
    cam.position.x += (ponteiro.nx * 2.4 * paralaxe - cam.position.x) * 0.04;
    cam.position.y = camY - ponteiro.ny * 1.2 * paralaxe;
    cam.lookAt(ponteiro.nx * 1.1 * paralaxe, camY, 0);

    const pp = geoPoeira.attributes.position.array;
    for (let i = 0; i < POEIRA; i++) {
      const idx = i * 3;
      pp[idx] = base[idx] + Math.sin(t * 0.34 + fase[i]) * 1.3 * fMov;
      pp[idx + 1] = base[idx + 1] + Math.sin(t * 0.6 + fase[i] * 0.7) * 0.42 * fMov;
    }
    geoPoeira.attributes.position.needsUpdate = true;
    matPoeira.opacity = 0.3 + Math.sin(t * 0.45) * 0.07;

    kelp.update(t, fMov);

    /* os feixes desbotam conforme a leitura desce — a luz da superfície não
       alcança o fim da página */
    const luzSuperficie = Math.max(0, 1 - prof * 1.25);
    raios.forEach((raio, i) => {
      const d = raio.userData;
      raio.material.opacity = d.baseOp * luzSuperficie * (0.82 + 0.18 * Math.sin(t * d.deriva + d.fase));
      raio.position.x = d.baseX + Math.sin(t * d.deriva + d.fase) * 1.4 * fMov;
      raio.position.y = d.baseY + camY * 0.08;
      raio.rotation.z = d.baseRot + Math.sin(t * 0.16 + i) * 0.04 * fMov;
    });

    renderer.render(scene, cam);
  }

  function prepare() {
    return precompileRenderer(renderer, scene, cam);
  }

  function dispose() {
    disposeSceneResources(scene);
    renderer.dispose();
  }

  return { resize, setPointerNDC, setScrollProgress, prepare, update, dispose };
}
