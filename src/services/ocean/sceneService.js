import * as THREE from 'three';
import { rnd } from './utils';
import { optimizeParticleGeometry } from './particleBudget';
import { PROF, LARG, DEPTH_STOPS } from './constants';
import { aquecerUploads, disposeSceneResources, getWebGLPixelRatio, precompileRenderer } from './webglUtils';
import {
  construirPeixeOrganico,
  construirCoralOrganico,
  construirCaranguejoOrganico,
  texBrilho,
  texPonto,
} from './creatureBuilders';
import {
  M_CARPA,
  M_DOURADO,
  M_NEON,
  M_SALMAO,
  M_BARRACUDA,
  M_MACHADO,
  M_LANTERNA,
  M_TAMBORIL,
} from './creatureConfigs';

const PARADAS = DEPTH_STOPS.map(([t, hex]) => [t, new THREE.Color(hex)]);
const corProfScratch = new THREE.Color();

/** Escreve o resultado em `out` (padrão: escopo interno reutilizável) para evitar
 * alocar um THREE.Color novo a cada chamada — é invocada várias vezes por frame. */
function corProf(t, out = corProfScratch) {
  for (let i = 0; i < PARADAS.length - 1; i++) {
    const [a, ca] = PARADAS[i];
    const [b, cb] = PARADAS[i + 1];
    if (t <= b) return out.copy(ca).lerp(cb, (t - a) / (b - a));
  }
  return out.copy(PARADAS[PARADAS.length - 1][1]);
}

/**
 * Cria e orquestra toda a cena 3D do oceano (criaturas, ambiente, interação).
 * Não depende de React: recebe um <canvas> e devolve uma API imperativa que
 * o hook `useOceanScene` chama a cada frame / evento.
 */
export function createOceanScene(canvas, { reducedMotion = false } = {}) {
  const reduz = reducedMotion;
  const fMov = reduz ? 0.3 : 1;

  /* O WebGLRenderer já registra seus próprios listeners de webglcontextlost/
     restored: render() vira no-op enquanto o contexto está perdido e o contexto
     é reinicializado sozinho quando volta. Não há guard manual a manter aqui. */
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, stencil: false, powerPreference: 'high-performance',
  });
  let larguraViewport = window.innerWidth;
  let alturaViewport = window.innerHeight;
  let escalaResolucao = 1;
  renderer.setPixelRatio(getWebGLPixelRatio(larguraViewport));
  const scene = new THREE.Scene();
  /* máscara redonda compartilhada por todos os materiais de partícula */
  const mapaPonto = texPonto();

  const cam = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight || 1, 0.1, 320);
  cam.position.set(0, 0, 58);
  const tanMetadeFov = Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5));

  let alvoY = 0;
  let camY = 0;

  /* ============ CRIATURAS ============ */
  const criaturas = [];
  const habitantesFundo = [];
  const coraisFundo = [];

  /* idem para as pernas do caranguejo: quais vértices são "perna" (vs
     carapaça) e a fase de cada uma não mudam depois de criadas. */
  function precomputeCrabLegs(entry) {
    const base = entry.base;
    const n = base.length / 3;
    entry.legLimb = new Uint8Array(n);
    entry.legPhase = new Float32Array(n);
    entry.legSide = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 3) {
      const bx = base[j], by = base[j + 1];
      if (Math.abs(by) <= 0.72 && Math.abs(bx) <= 1.2) continue;
      entry.legLimb[i] = 1;
      const side = by >= 0 ? 1 : -1;
      const legBand = Math.floor(Math.abs(bx) * 2.2);
      entry.legSide[i] = side;
      entry.legPhase[i] = entry.fase + legBand * Math.PI * 0.72 + side * Math.PI * 0.5;
    }
  }

  /* Um único pool atende todas as profundidades. A superfície é a zona com
     mais peixes (13), portanto ela define a quantidade de slots. Cada slot
     mantém sempre 96 partículas na GPU; ao descer, posição e cor dessas
     mesmas partículas interpolam para a espécie da zona seguinte. */
  const PARTICULAS_POR_PEIXE = 96;
  const TOTAL_PEIXES_POOL = 13;
  const DURACAO_TRANSICAO = reduz ? 0.65 : 3.2;
  const FRACAO_DESMONTAGEM = 0.22;
  const lerp = THREE.MathUtils.lerp;

  function opcoes(def, o) {
    return {
      def, px: o.px, tam: o.tam, op: o.op ?? 0.92,
      y: o.y, z: o.z ?? rnd(-10, 6), raio: o.raio, vel: o.vel,
      fase: o.fase ?? rnd(0, 6.28),
      grupoX: o.grupoX ?? 0, grupoY: o.grupoY ?? 0,
      brilho: o.brilho, brilhoTam: o.brilhoTam ?? 0,
      brilhoOp: o.brilhoOp ?? 0, brilhoOff: o.brilhoOff ?? { x: 0, y: 0 },
    };
  }

  const superficiePeixes = [
    ...Array.from({ length: 4 }, () => opcoes(M_CARPA, { y: rnd(6, -16), raio: rnd(20, 34), vel: rnd(0.13, 0.2), px: 0.68, tam: 0.7 })),
    ...Array.from({ length: 4 }, () => opcoes(M_DOURADO, { y: rnd(8, -18), raio: rnd(16, 30), vel: rnd(0.16, 0.24), px: 0.6, tam: 0.62 })),
    ...Array.from({ length: 5 }, () => opcoes(M_NEON, { y: rnd(4, -22), raio: rnd(14, 26), vel: rnd(0.22, 0.3), px: 0.5, tam: 0.52, op: 0.85 })),
  ];

  const fasePod = rnd(0, 6.28);
  const yPod = rnd(-64, -82);
  const raioPod = rnd(34, 44);
  const velPod = rnd(0.09, 0.13);
  const crepusculoPeixes = [
    ...Array.from({ length: 6 }, () => opcoes(M_MACHADO, { y: rnd(-48, -92), raio: rnd(16, 30), vel: rnd(0.2, 0.3), px: 0.48, tam: 0.5, op: 0.85 })),
    opcoes(M_BARRACUDA, { y: yPod, raio: raioPod, vel: velPod, fase: fasePod, px: 0.85, tam: 0.58, z: rnd(-18, -12), op: 0.78, grupoX: -3 }),
    opcoes(M_BARRACUDA, { y: yPod, raio: raioPod * 0.94, vel: velPod * 1.05, fase: fasePod + 0.1, px: 0.7, tam: 0.5, z: rnd(-15, -9), op: 0.72, grupoX: 6, grupoY: 3.4 }),
    opcoes(M_BARRACUDA, { y: yPod, raio: raioPod * 0.88, vel: velPod * 1.1, fase: fasePod - 0.08, px: 0.58, tam: 0.44, z: rnd(-16, -10), op: 0.68, grupoX: 11, grupoY: -2.4 }),
    ...Array.from({ length: 3 }, () => opcoes(M_SALMAO, { y: rnd(-56, -86), raio: rnd(26, 38), vel: rnd(0.15, 0.22), px: 0.82, tam: 0.62 })),
  ];
  const abismoPeixes = [
    ...Array.from({ length: 6 }, () => opcoes(M_LANTERNA, { y: rnd(-104, -138), raio: rnd(14, 26), vel: rnd(0.14, 0.2), px: 0.5, tam: 0.55, op: 0.9, brilho: 'rgba(90,232,184,.9)', brilhoTam: 3.4, brilhoOp: 0.5 })),
    ...Array.from({ length: 2 }, () => opcoes(M_TAMBORIL, { y: rnd(-112, -140), raio: rnd(18, 26), vel: rnd(0.06, 0.09), px: 1.05, tam: 1.05, brilho: 'rgba(174,255,240,.95)', brilhoTam: 7, brilhoOff: { x: 2.55, y: 2.45 }, brilhoOp: 0.9 })),
  ];

  function criarForma(config) {
    if (!config) return null;
    const forma = construirPeixeOrganico(config.def.organico, config.px);
    const origemPos = forma.base;
    const origemCor = forma.geo.attributes.color.array;
    const origemN = origemPos.length / 3;
    const base = new Float32Array(PARTICULAS_POR_PEIXE * 3);
    const cor = new Float32Array(PARTICULAS_POR_PEIXE * 3);
    const faseOnda = new Float32Array(PARTICULAS_POR_PEIXE);
    const ampOnda = new Float32Array(PARTICULAS_POR_PEIXE);
    for (let i = 0; i < PARTICULAS_POR_PEIXE; i++) {
      const origem = Math.floor((i * origemN) / PARTICULAS_POR_PEIXE) * 3;
      const j = i * 3;
      base[j] = origemPos[origem]; base[j + 1] = origemPos[origem + 1]; base[j + 2] = origemPos[origem + 2];
      cor[j] = origemCor[origem]; cor[j + 1] = origemCor[origem + 1]; cor[j + 2] = origemCor[origem + 2];
      faseOnda[i] = base[j] * 1.1;
      ampOnda[i] = 0.05 + (base[j] < 0 ? -base[j] * 0.16 : 0);
    }
    forma.geo.dispose();
    return { config, base, cor, faseOnda, ampOnda };
  }

  function formaOculta(referencia, zona) {
    const base = new Float32Array(PARTICULAS_POR_PEIXE * 3);
    const cor = new Float32Array(PARTICULAS_POR_PEIXE * 3);
    const faseOnda = new Float32Array(PARTICULAS_POR_PEIXE);
    const ampOnda = new Float32Array(PARTICULAS_POR_PEIXE);
    const config = {
      ...referencia.config, op: 0, tam: referencia.config.tam * 0.45,
      y: zona === 1 ? -82 : -132, raio: 8, grupoX: 0, grupoY: 0,
      brilhoOp: 0, brilhoTam: 0,
    };
    return { config, base, cor, faseOnda, ampOnda };
  }

  function criarDispersao(indiceSlot, indiceTransicao) {
    const base = new Float32Array(PARTICULAS_POR_PEIXE * 3);
    const cor = new Float32Array(PARTICULAS_POR_PEIXE * 3);
    const aqua = new THREE.Color('#7fe3d0');
    const ouro = new THREE.Color('#aeb5b7');
    for (let i = 0; i < PARTICULAS_POR_PEIXE; i++) {
      const j = i * 3;
      const angulo = rnd(0, Math.PI * 2);
      const raio = rnd(4.5, 13.5) * (0.72 + (i % 7) * 0.055);
      /* A nuvem abre mais no eixo horizontal. O eixo vertical é simétrico
         para não empurrar partículas para fora quando o peixe toca a borda. */
      base[j] = Math.cos(angulo) * raio + rnd(-2.4, 2.4);
      base[j + 1] = Math.sin(angulo) * raio * 0.62 + rnd(-2.2, 2.2);
      base[j + 2] = rnd(-5.5, 5.5);
      const c = (i + indiceSlot + indiceTransicao) % 6 === 0 ? ouro : aqua;
      const intensidade = rnd(0.42, 0.88);
      cor[j] = c.r * intensidade; cor[j + 1] = c.g * intensidade; cor[j + 2] = c.b * intensidade;
    }
    return { base, cor };
  }

  for (let i = 0; i < TOTAL_PEIXES_POOL; i++) {
    const formas = [
      criarForma(superficiePeixes[i]),
      criarForma(crepusculoPeixes[i]),
      criarForma(abismoPeixes[i]),
    ];
    if (!formas[1]) formas[1] = formaOculta(formas[0], 1);
    if (!formas[2]) formas[2] = formaOculta(formas[1], 2);

    const pos = new Float32Array(formas[0].base);
    const col = new Float32Array(formas[0].cor);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      map: mapaPonto,
      size: formas[0].config.tam, vertexColors: true, transparent: true,
      opacity: formas[0].config.op, depthWrite: false, sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const obj = new THREE.Points(geo, mat);
    scene.add(obj);
    const cr = {
      obj, geo, formas,
      dispersoes: [criarDispersao(i, 0), criarDispersao(i, 1)],
      hoverEmMovimento: false,
      hoverLocalX: 0,
      hoverLocalY: 0,
      hoverOffset: new Float32Array(PARTICULAS_POR_PEIXE * 2),
      hoverVelocidade: new Float32Array(PARTICULAS_POR_PEIXE * 2),
      cursorSobre: false,
      hoverPulso: 0,
      zonaAtual: 0,
      zonaCor: 0,
      transicao: null,
    };

    const configBrilho = abismoPeixes[i];
    if (configBrilho?.brilho) {
      cr.brilho = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texBrilho(configBrilho.brilho), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
      }));
      scene.add(cr.brilho);
    }
    criaturas.push(cr);
  }

  /* — krill em dois bolsões (assinatura da superfície) — subido junto com a
     nuvem/peixes de superfície (mesmo deslocamento de +14). */
  const cardume = (function () {
    const grupos = [
      { cx: -30, cy: 1, rx: 22, ry: 9, z: -4, phase: rnd(0, 6.28) },
      { cx: 34, cy: -7, rx: 26, ry: 8, z: -8, phase: rnd(0, 6.28) },
    ];
    const K = 170, ptsPorKrill = 3, N = K * ptsPorKrill;
    const pos = new Float32Array(N * 3), off = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const meta = new Float32Array(K * 4);
    const pearl = new THREE.Color('#d8ecea'), aqua = new THREE.Color('#7fe3d0'), shade = new THREE.Color('#5f8fa8');
    for (let k = 0; k < K; k++) {
      const grupo = k < K * 0.52 ? 0 : 1;
      const g = grupos[grupo];
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.56);
      const ox = Math.cos(a) * g.rx * r + rnd(-1.4, 1.4);
      const oy = Math.sin(a) * g.ry * r + rnd(-0.9, 0.9);
      const oz = g.z + rnd(-4.5, 4.5);
      meta[k * 4] = grupo;
      meta[k * 4 + 1] = rnd(0, 6.28);
      meta[k * 4 + 2] = rnd(0.4, 1.1);
      meta[k * 4 + 3] = rnd(0.65, 1.35);
      for (let q = 0; q < ptsPorKrill; q++) {
        const i = k * ptsPorKrill + q;
        const body = (q - 1) * 0.28;
        off[i * 3] = ox + body;
        off[i * 3 + 1] = oy + (q === 1 ? 0 : rnd(-0.08, 0.08));
        off[i * 3 + 2] = oz + rnd(-0.05, 0.05);
        const c = q === 1 ? pearl : Math.random() > 0.45 ? aqua : shade;
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({
      map: mapaPonto,
      size: 0.34, vertexColors: true, transparent: true, opacity: 0.78, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    scene.add(p);
    return { p, g, off, meta, grupos, K, ptsPorKrill };
  })();

  /* — leito oceânico — */
  (function leito() {
    const N = 900;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const c1 = new THREE.Color('#101c2e'), c2 = new THREE.Color('#1a2a40');
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rnd(-130, 130);
      pos[i * 3 + 1] = -PROF - 4 + rnd(0, 2.4) * Math.random();
      pos[i * 3 + 2] = rnd(-24, 10);
      const c = Math.random() > 0.75 ? c2 : c1;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({
      map: mapaPonto,
      size: 0.55, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false,
    })));
    const paletas = [
      { base: '#285c55', tip: '#7fe3d0' },
      { base: '#4d3750', tip: '#d98fb8' },
      { base: '#53472f', tip: '#aeb5b7' },
      { base: '#244a65', tip: '#8fb8d0' },
    ];
    const formas = ['fan', 'bush', 'pillar', 'antler'];
    for (let i = 0; i < 14; i++) {
      const pal = paletas[Math.floor(Math.random() * paletas.length)];
      const form = formas[i % formas.length];
      const b = construirCoralOrganico({
        base: pal.base, tip: pal.tip,
        form,
        branches: Math.floor(rnd(4, 9)),
        segments: Math.floor(rnd(9, 15)),
        crown: Math.floor(rnd(3, 5)),
        height: rnd(3.8, 8.8),
        spread: rnd(2.2, 5.2),
        thick: rnd(0.65, 1.15),
      }, rnd(0.45, 0.85));
      const optimized = optimizeParticleGeometry(
        b.geo,
        b.base,
        { density: 44, minParticles: 38, importance: 1.05 },
      );
      const p = new THREE.Points(optimized.geometry, new THREE.PointsMaterial({
        map: mapaPonto,
        size: rnd(0.34, 0.52), vertexColors: true, transparent: true,
        opacity: Math.min(0.96, 0.78 * optimized.brightness),
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      p.position.set(rnd(-LARG, LARG), -PROF - 1.6, rnd(-11, 4));
      const baseRotation = rnd(-0.16, 0.16);
      p.rotation.z = baseRotation;
      scene.add(p);
      let maxHeight = 0;
      for (let j = 1; j < optimized.base.length; j += 3) {
        maxHeight = Math.max(maxHeight, optimized.base[j]);
      }
      coraisFundo.push({
        p,
        geo: optimized.geometry,
        base: optimized.base,
        maxHeight: Math.max(0.1, maxHeight),
        phase: rnd(0, Math.PI * 2),
        speed: rnd(0.28, 0.48),
        sway: rnd(0.07, 0.18),
        baseRotation,
      });
    }
    for (let i = 0; i < 2; i++) {
      const b = construirCaranguejoOrganico({
        shell: i ? '#5f3d34' : '#7a4a3a',
        edge: i ? '#788184' : '#858e91',
        bodyCount: 76,
      }, rnd(1.12, 1.34));
      const optimized = optimizeParticleGeometry(b.geo, b.base, {
        density: 52,
        minParticles: 72,
        importance: 1.18,
      });
      const p = new THREE.Points(optimized.geometry, new THREE.PointsMaterial({
        map: mapaPonto,
        size: rnd(0.34, 0.42), vertexColors: true, transparent: true,
        opacity: Math.min(0.96, 0.82 * optimized.brightness),
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
      }));
      p.position.set(i ? rnd(14, 44) : rnd(-48, -18), -PROF + rnd(-0.4, 0.5), rnd(-7, 3));
      p.rotation.z = rnd(-0.025, 0.025);
      p.renderOrder = 4;
      scene.add(p);
      const habitante = {
        tipo: 'caranguejo', obj: p, geo: optimized.geometry, base: optimized.base, esc: 1,
        x0: p.position.x, z0: p.position.z, fase: rnd(0, 6.28), vel: rnd(0.18, 0.28),
      };
      precomputeCrabLegs(habitante);
      habitantesFundo.push(habitante);
    }
  })();

  /* — raios de sol — */
  const raios = [];
  (function () {
    const c = document.createElement('canvas'); c.width = 96; c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(174,181,183,.42)');
    g.addColorStop(0.28, 'rgba(56,189,227,.16)');
    g.addColorStop(1, 'rgba(56,189,227,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(38, 0);
    ctx.bezierCurveTo(54, 42, 64, 106, 78, 256);
    ctx.lineTo(28, 256);
    ctx.bezierCurveTo(36, 136, 24, 52, 38, 0);
    ctx.closePath();
    ctx.fill();
    const soft = ctx.createRadialGradient(48, 42, 0, 48, 42, 68);
    soft.addColorStop(0, 'rgba(255,246,218,.18)');
    soft.addColorStop(1, 'rgba(255,246,218,0)');
    ctx.fillStyle = soft; ctx.fillRect(0, 0, 96, 150);
    const tex = new THREE.CanvasTexture(c);
    const cFonte = document.createElement('canvas'); cFonte.width = 160; cFonte.height = 48;
    const ctxFonte = cFonte.getContext('2d');
    const brilho = ctxFonte.createRadialGradient(80, 18, 0, 80, 18, 78);
    brilho.addColorStop(0, 'rgba(255,246,218,.35)');
    brilho.addColorStop(0.34, 'rgba(56,189,227,.18)');
    brilho.addColorStop(1, 'rgba(56,189,227,0)');
    ctxFonte.fillStyle = brilho;
    ctxFonte.fillRect(0, 0, 160, 48);
    const texFonte = new THREE.CanvasTexture(cFonte);
    for (let i = 0; i < 9; i++) {
      const h = rnd(74, 112), w = rnd(6, 15);
      const geo = new THREE.PlaneGeometry(w, h);
      geo.translate(0, -h * 0.5, 0);
      const m = new THREE.Mesh(geo,
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: rnd(0.18, 0.34) }));
      const origemX = rnd(-62, 62);
      /* subidos junto com a nuvem/peixes de superfície — mesmo deslocamento
         de +14, para os raios continuarem partindo de perto da "água". */
      const origemY = rnd(10.2, 15.8);
      m.position.set(origemX, origemY, rnd(-22, -7));
      m.rotation.z = rnd(-0.34, -0.1);
      const fonte = new THREE.Mesh(new THREE.PlaneGeometry(w * rnd(1.5, 2.4), rnd(2.6, 4.2)),
        new THREE.MeshBasicMaterial({ map: texFonte, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: rnd(0.12, 0.22) }));
      fonte.position.set(origemX, origemY + rnd(0.2, 1.1), m.position.z + 0.12);
      fonte.rotation.z = m.rotation.z * 0.35;
      m.userData = {
        baseX: m.position.x, baseY: m.position.y, baseRot: m.rotation.z,
        fonte, fonteBaseOp: fonte.material.opacity,
        fonteBaseX: fonte.position.x, fonteBaseY: fonte.position.y, fonteBaseRot: fonte.rotation.z,
        baseOp: m.material.opacity, drift: rnd(0.18, 0.46), phase: rnd(0, 6.28),
      };
      scene.add(fonte);
      scene.add(m); raios.push(m);
    }
  })();

  /* — superfície em partículas — */
  const superficie = (function () {
    const N = 1600;
    const pos = new Float32Array(N * 3), base = new Float32Array(N * 3), col = new Float32Array(N * 3);
    /* fase/amplitude da deriva de cada partícula só dependem da posição-base
       (fixa) — pré-computadas aqui para o loop de animação não recalcular
       depthT/senos-de-fase em 1380 partículas a cada frame. */
    const wavePhaseA = new Float32Array(N), waveAmpA = new Float32Array(N);
    const wavePhaseB = new Float32Array(N);
    const wavePhaseC = new Float32Array(N), waveAmpB = new Float32Array(N);
    const wavePhaseD = new Float32Array(N);
    const wavePhaseE = new Float32Array(N), waveAmpC = new Float32Array(N);
    const deep = new THREE.Color('#1f6e72');
    const glow = new THREE.Color('#7fe3d0');
    const gold = new THREE.Color('#aeb5b7');
    for (let i = 0; i < N; i++) {
      const lane = Math.floor(Math.random() * 42);
      const depthT = Math.pow(Math.random(), 0.85);
      const idx = i * 3;
      const spread = 78 + depthT * 28;
      const x = rnd(-spread, spread) + (depthT - 0.5) * 18;
      const z = -30 + depthT * 28 + rnd(-1.8, 1.8);
      /* nuvem deslocada para cima (não só esticada): o topo do frustum na
         carga da página (câmera em y=0) fica em ~y=27, e a faixa antiga
         (-8.5 a 15.5) parava bem abaixo disso, deixando um vão vazio no topo
         da tela. */
      const y = 5 + depthT * 24 + lane * 0.08 + x * 0.018 + Math.sin(x * 0.055 + lane * 0.52 + depthT * 3) * 1.15 + rnd(-0.24, 0.24);
      base[idx] = pos[idx] = x;
      base[idx + 1] = pos[idx + 1] = y;
      base[idx + 2] = pos[idx + 2] = z;
      const brilho = Math.abs(Math.sin(x * 0.075 + lane * 0.55 + depthT * 2.2)) > 0.84;
      const c = Math.random() > 0.94 ? gold : brilho ? glow : deep;
      col[idx] = c.r; col[idx + 1] = c.g; col[idx + 2] = c.b;

      const depthT2 = (z + 30) / 28;
      wavePhaseA[i] = y * 0.7 + z * 0.12;
      waveAmpA[i] = 0.7 + depthT2 * 1.35;
      wavePhaseB[i] = i * 0.17;
      wavePhaseC[i] = x * 0.04 + i * 0.025;
      waveAmpB[i] = 0.18 + depthT2 * 0.35;
      wavePhaseD[i] = z * 0.2;
      wavePhaseE[i] = x * 0.03 + i * 0.06;
      waveAmpC[i] = 0.24 + depthT2 * 0.5;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      map: mapaPonto,
      size: 0.32, vertexColors: true, transparent: true, opacity: 0.48,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const p = new THREE.Points(g, m);
    p.rotation.z = -0.035;
    p.renderOrder = 2;
    scene.add(p);
    return {
      p, g, base, m, N,
      wavePhaseA, waveAmpA, wavePhaseB, wavePhaseC, waveAmpB, wavePhaseD, wavePhaseE, waveAmpC,
    };
  })();

  /* — poeira d'água (todas as profundidades) — */
  const poeira = (function () {
    const N = 800;
    const pos = new Float32Array(N * 3), base = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      base[i * 3] = pos[i * 3] = rnd(-90, 90);
      base[i * 3 + 1] = pos[i * 3 + 1] = rnd(6, -PROF - 6);
      base[i * 3 + 2] = pos[i * 3 + 2] = rnd(-22, 12);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ map: mapaPonto, color: 0x7fe3d0, size: 0.22, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    scene.add(new THREE.Points(g, m));
    return { g, base, m, N };
  })();

  /* — neve marinha (abismo) — */
  const neve = (function () {
    const N = 260, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rnd(-70, 70); pos[i * 3 + 1] = rnd(-80, -PROF - 6); pos[i * 3 + 2] = rnd(-18, 10);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ map: mapaPonto, color: 0xbfd8e8, size: 0.4, transparent: true, opacity: 0, depthWrite: false });
    const p = new THREE.Points(g, m); scene.add(p);
    return { p, g, m, N };
  })();

  /* — bolhas ambientes — */
  const bolhas = [];
  const texBolhaP = texBrilho('rgba(207,238,233,.9)');
  function soltarBolha(x, y, z) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texBolhaP, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    const e = rnd(0.3, 0.8); s.scale.set(e, e, 1); s.position.set(x, y, z);
    scene.add(s); bolhas.push({ s, vel: rnd(3, 6), fase: rnd(0, 6), vida: rnd(2, 3.5) });
  }

  /* Explosões são criadas apenas no impacto e vivem menos de um segundo. O
     peixe usa seu próprio campo de velocidades para se desmontar e voltar;
     esta nuvem adicional fornece o clarão de partículas do torpedo. */
  const explosoes = [];
  const corExplosaoA = new THREE.Color('#eef2f3');
  const corExplosaoB = new THREE.Color('#7fe3d0');
  function criarExplosao(x, y, z) {
    const quantidade = reduz ? 22 : 46;
    const posicoes = new Float32Array(quantidade * 3);
    const velocidades = new Float32Array(quantidade * 3);
    const cores = new Float32Array(quantidade * 3);
    for (let i = 0, j = 0; i < quantidade; i++, j += 3) {
      const angulo = rnd(0, Math.PI * 2);
      const velocidade = rnd(5.5, 14);
      posicoes[j] = x; posicoes[j + 1] = y; posicoes[j + 2] = z + rnd(-0.35, 0.35);
      velocidades[j] = Math.cos(angulo) * velocidade;
      velocidades[j + 1] = Math.sin(angulo) * velocidade;
      velocidades[j + 2] = rnd(-3.2, 3.2);
      const cor = i % 4 === 0 ? corExplosaoA : corExplosaoB;
      const intensidade = rnd(0.72, 1);
      cores[j] = cor.r * intensidade;
      cores[j + 1] = cor.g * intensidade;
      cores[j + 2] = cor.b * intensidade;
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
    geometria.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    const material = new THREE.PointsMaterial({
      map: mapaPonto,
      size: 0.72, vertexColors: true, transparent: true, opacity: 1,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const pontos = new THREE.Points(geometria, material);
    pontos.renderOrder = 12;
    scene.add(pontos);
    explosoes.push({ pontos, geometria, material, velocidades, vida: 0.82 });
  }

  /* ============ INTERAÇÃO ============ */
  const mouse = { nx: 0, ny: 0, ativo: false };
  const hoverDisponivel = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mouseMundoDir = new THREE.Vector3();
  const torpedoMundoDir = new THREE.Vector3();

  function atualizarRaioMouse() {
    mouseMundoDir.set(mouse.nx, mouse.ny, 0.5).unproject(cam).sub(cam.position).normalize();
  }

  /* o gradiente de fundo cobre a tela inteira (#fundo é fixed/inset:0, com
     mix-blend-mode e filter no CSS) — recalcular e escrever no DOM a 45fps é
     caro (repaint de tela cheia) e imperceptível; 1 em cada 8 frames (~5-6fps)
     já é suave o bastante para uma deriva ambiente lenta. bgDepth/bgSurface
     alimentam variáveis CSS lidas pelos mesmos pseudo-elementos, então
     precisam do mesmo throttle — do contrário o corpo do gradiente já era
     limitado, mas essas duas variáveis continuavam disparando repaint a
     cada frame durante qualquer movimento de câmera. */
  /* Cada troca da string reescreve o `background` de #fundo, que ocupa a tela
     inteira — ou seja, um repaint de viewport cheio. A 8 quadros isso
     acontecia ~7 vezes por segundo, o tempo todo, porque o gradiente também
     acompanha o relógio da cena. A 20 o desenho anda 0,3px por passo: nada
     perceptível, um terço dos repaints. */
  const BG_UPDATE_INTERVAL = 20;
  let bgFrameCounter = 0;
  let backgroundCssCache = '';
  let bgDepthCache = '';
  let bgSurfaceCache = '';

  let ultimoInstante = performance.now();
  let elapsed = 0;
  let acum = 0;
  let mediaTempoFrame = 1 / 60;
  let ultimoAjusteResolucao = ultimoInstante;
  let framesDesdeAjuste = 0;

  /* ============ API PÚBLICA ============ */
  function resize(width, height) {
    larguraViewport = width;
    alturaViewport = height;
    renderer.setPixelRatio(getWebGLPixelRatio(width) * escalaResolucao);
    renderer.setSize(width, height);
    cam.aspect = width / height;
    cam.updateProjectionMatrix();
  }

  function setPointerNDC(nx, ny) {
    mouse.nx = nx;
    mouse.ny = ny;
    mouse.ativo = true;
  }

  function clearPointer() {
    mouse.ativo = false;
  }

  function handleTorpedoStep(clientX, clientY) {
    torpedoMundoDir
      .set((clientX / larguraViewport) * 2 - 1, -(clientY / alturaViewport) * 2 + 1, 0.5)
      .unproject(cam)
      .sub(cam.position)
      .normalize();

    let atingido = null;
    let impactoX = 0;
    let impactoY = 0;
    let menorDistanciaRaio = Infinity;
    criaturas.forEach((cr) => {
      const o = cr.obj;
      if (!o.visible || cr.transicao || o.material.opacity <= 0.05) return;
      const distanciaRaio = (o.position.z - cam.position.z) / torpedoMundoDir.z;
      if (distanciaRaio <= 0 || distanciaRaio >= menorDistanciaRaio) return;
      const mundoX = cam.position.x + torpedoMundoDir.x * distanciaRaio;
      const mundoY = cam.position.y + torpedoMundoDir.y * distanciaRaio;
      const cfg = cr.formas[cr.zonaAtual].config;
      const raio = Math.max(3.4, cfg.def.organico.len * cfg.px * 0.72);
      if (Math.hypot(mundoX - o.position.x, mundoY - o.position.y) > raio) return;
      atingido = cr;
      impactoX = mundoX;
      impactoY = mundoY;
      menorDistanciaRaio = distanciaRaio;
    });
    if (!atingido) return false;

    const o = atingido.obj;
    const cos = Math.cos(o.rotation.z);
    const sin = Math.sin(o.rotation.z);
    const dx = impactoX - o.position.x;
    const dy = impactoY - o.position.y;
    const localX = dx * cos + dy * sin;
    const localY = (-dx * sin + dy * cos) / o.scale.y;
    const posicoes = atingido.geo.attributes.position.array;
    for (let i = 0, j = 0; i < PARTICULAS_POR_PEIXE; i++, j += 3) {
      const h = i * 2;
      const partX = posicoes[j] - localX;
      const partY = posicoes[j + 1] - localY;
      const distancia = Math.max(0.16, Math.hypot(partX, partY));
      const queda = Math.max(0.18, 1 - distancia / 13);
      const impulso = rnd(0.75, 1.25) * (0.42 + queda * 1.05);
      atingido.hoverVelocidade[h] += (partX / distancia) * impulso;
      atingido.hoverVelocidade[h + 1] += (partY / distancia) * impulso;
    }
    atingido.hoverEmMovimento = true;
    criarExplosao(impactoX, impactoY, o.position.z + 0.5);
    return true;
  }

  function setScrollProgress(progress) {
    alvoY = -progress * PROF;
  }

  /* Paradas da câmera na coluna d'água durante o aquecimento. O frustum cobre
     ~56 unidades de altura, então 6 passos (25 unidades cada) deixam as faixas
     se sobreporem — nenhuma profundidade estreia durante a rolagem. */
  const PASSOS_AQUECIMENTO = 6;
  /* Teto de tempo do aquecimento. Num aparelho lento, entrar com parte da cena
     fria é melhor do que segurar a tela de carregamento indefinidamente. */
  const ORCAMENTO_AQUECIMENTO_MS = 900;

  function proximoQuadro() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  /**
   * Trabalho que a tela de carregamento absorve para a rolagem não pagar depois:
   * linkar os shaders, subir geometrias e texturas para a GPU e desenhar uma vez
   * cada faixa de profundidade.
   */
  async function prepare() {
    await precompileRenderer(renderer, scene, cam);

    try {
      /* A textura das bolhas é a única que nenhum objeto da cena referencia
         ainda: o primeiro sprite só nasce alguns segundos depois do início. */
      renderer.initTexture(texBolhaP);
      aquecerUploads(renderer, scene, cam);

      /* Com tudo já na GPU, desce a câmera pela coluna para exercitar também o
         caminho de desenho normal de cada faixa — a montagem da lista de
         renderização e o preenchimento do abismo, onde muitos pontos aditivos se
         sobrepõem. Um `requestAnimationFrame` entre as passadas devolve a thread
         para a animação da tela de carregamento seguir fluida. */
      const limite = performance.now() + ORCAMENTO_AQUECIMENTO_MS;
      const yOriginal = cam.position.y;
      for (let passo = 1; passo <= PASSOS_AQUECIMENTO; passo++) {
        await proximoQuadro();
        cam.position.y = -(passo / PASSOS_AQUECIMENTO) * PROF;
        renderer.render(scene, cam);
        if (performance.now() > limite) break;
      }
      cam.position.y = yOriginal;
    } catch (erro) {
      /* Aquecer é otimização: falhar aqui não pode derrubar a cena para o
         fallback de "cena indisponível". */
      console.warn('Aquecimento da cena incompleto; seguindo com o renderer normal.', erro);
    }

    /* O relógio do laço começa agora, e não na construção da cena: sem isto o
       primeiro `update` veria todo o tempo de carregamento como um único `dt`. */
    ultimoInstante = performance.now();
    ultimoAjusteResolucao = ultimoInstante;
  }

  function update() {
    const agora = performance.now();
    const dt = Math.min((agora - ultimoInstante) / 1000, 0.05);
    ultimoInstante = agora;
    elapsed += dt;
    const t = elapsed;

    /* Se o dispositivo não sustenta o orçamento de ~20ms por quadro, reduz
       gradualmente apenas a resolução interna do canvas. A geometria e o
       número de partículas permanecem iguais; quando há folga, a nitidez
       volta em passos pequenos para evitar oscilações. */
    mediaTempoFrame += (dt - mediaTempoFrame) * 0.035;
    framesDesdeAjuste++;
    if (agora - ultimoAjusteResolucao > 2600 && framesDesdeAjuste > 55) {
      const escalaAnterior = escalaResolucao;
      if (mediaTempoFrame > 1 / 45 && escalaResolucao > 0.85) {
        escalaResolucao = Math.max(0.85, escalaResolucao - 0.15);
      } else if (mediaTempoFrame < 1 / 54 && escalaResolucao < 1) {
        escalaResolucao = Math.min(1, escalaResolucao + 0.1);
      }
      if (escalaResolucao !== escalaAnterior) {
        renderer.setPixelRatio(getWebGLPixelRatio(larguraViewport) * escalaResolucao);
        renderer.setSize(larguraViewport, alturaViewport, false);
      }
      ultimoAjusteResolucao = agora;
      framesDesdeAjuste = 0;
    }

    const camYAnterior = camY;
    camY += (alvoY - camY) * Math.min(1, dt * 3.2);
    const deslocamentoCamera = camY - camYAnterior;
    const direcaoRolagem = deslocamentoCamera < -0.0005 ? 1 : deslocamentoCamera > 0.0005 ? -1 : 0;
    const prof = Math.min(1, Math.max(0, -camY / PROF));
    /* paralaxe sutil do mouse, atenuada no fundo */
    const mMult = (1 - prof * 0.5) * fMov;
    cam.position.x += (mouse.nx * 3 * mMult - cam.position.x) * 0.04;
    cam.position.y = camY - mouse.ny * 1.6 * mMult;
    cam.lookAt(mouse.nx * 1.4 * mMult, camY, 0);
    if (mouse.ativo) atualizarRaioMouse();

    bgFrameCounter++;
    if (bgFrameCounter % BG_UPDATE_INTERVAL === 0 || !backgroundCssCache) {
      bgDepthCache = prof.toFixed(3);
      bgSurfaceCache = Math.max(0, 1 - prof * 1.55).toFixed(3);
      const corCss = '#' + corProf(prof).getHexString();
      const corCss2 = '#' + corProf(Math.min(1, prof + 0.1)).getHexString();
      const corCss3 = '#' + corProf(Math.min(1, prof + 0.26)).getHexString();
      backgroundCssCache =
        `radial-gradient(110% 52% at 48% -14%, rgba(174,181,183,${0.24 * (1 - prof)}) 0%, rgba(56,189,227,${0.16 * (1 - prof)}) 34%, transparent 76%),` +
        `radial-gradient(80% 58% at ${66 + Math.sin(t * 0.08) * 5}% ${12 + Math.cos(t * 0.07) * 3}%, rgba(56,189,227,${0.11 * (1 - prof * 0.82)}) 0%, transparent 66%),` +
        `radial-gradient(72% 62% at ${18 + Math.cos(t * 0.06) * 4}% ${76 + Math.sin(t * 0.05) * 5}%, rgba(133,142,145,${0.07 * (1 - prof * 0.55)}) 0%, transparent 70%),` +
        `linear-gradient(178deg, rgba(255,246,218,${0.045 * (1 - prof)}) 0%, transparent 22%, rgba(1,7,15,${0.22 * prof}) 100%),` +
        `linear-gradient(164deg, ${corCss} 0%, ${corCss2} 48%, ${corCss3} 100%)`;
    }
    const bgDepth = bgDepthCache;
    const bgSurface = bgSurfaceCache;
    const backgroundCss = backgroundCssCache;

    const surfaceFade = Math.max(0, 1 - prof * 1.65);
    raios.forEach((r, i) => {
      const d = r.userData;
      const pulsoLuz = 0.82 + 0.18 * Math.sin(t * d.drift + d.phase);
      const driftX = Math.sin(t * d.drift + d.phase) * 1.6 * fMov;
      const driftY = Math.cos(t * (d.drift * 0.7) + d.phase) * 0.45 * fMov + camY * 0.08;
      r.material.opacity = d.baseOp * surfaceFade * pulsoLuz;
      r.position.x = d.baseX + driftX;
      r.position.y = d.baseY + driftY;
      r.rotation.z = d.baseRot + Math.sin(t * 0.18 + i) * 0.045 * fMov;
      if (d.fonte) {
        d.fonte.material.opacity = d.fonteBaseOp * surfaceFade * (0.76 + 0.24 * Math.sin(t * d.drift + d.phase + 0.7));
        d.fonte.position.x = d.fonteBaseX + driftX * 0.85;
        d.fonte.position.y = d.fonteBaseY + driftY * 0.45;
        d.fonte.rotation.z = d.fonteBaseRot + Math.sin(t * 0.16 + i) * 0.018 * fMov;
      }
    });

    /* superfície em partículas */
    {
      const fadeSuperficie = Math.max(0, 0.5 - prof * 1.85);
      superficie.m.opacity = fadeSuperficie * (1 + 0.08 * Math.sin(t * 0.7));
      superficie.p.visible = superficie.m.opacity > 0.005;
      if (superficie.p.visible) {
        const sp = superficie.g.attributes.position.array;
        const { base: sBase, wavePhaseA, waveAmpA, wavePhaseB, wavePhaseC, waveAmpB, wavePhaseD, wavePhaseE, waveAmpC } = superficie;
        for (let i = 0; i < superficie.N; i++) {
          const idx = i * 3;
          const bx = sBase[idx], by = sBase[idx + 1], bz = sBase[idx + 2];
          sp[idx] = bx + Math.sin(t * 0.48 + wavePhaseA[i]) * waveAmpA[i] * fMov + Math.sin(t * 0.9 + wavePhaseB[i]) * 0.2 * fMov;
          sp[idx + 1] = by + Math.sin(t * 0.72 + wavePhaseC[i]) * waveAmpB[i] * fMov + Math.sin(t * 0.22 + wavePhaseD[i]) * 0.18 * fMov;
          sp[idx + 2] = bz + Math.cos(t * 0.32 + wavePhaseE[i]) * waveAmpC[i] * fMov;
        }
        superficie.g.attributes.position.needsUpdate = true;
      }
      superficie.p.position.y = camY * 0.12;
      superficie.p.rotation.z = -0.035 + Math.sin(t * 0.08) * 0.012 * fMov;
      superficie.p.rotation.x = Math.sin(t * 0.07) * 0.018 * fMov;
    }

    /* poeira: cor e deriva */
    poeira.m.color.setRGB(0.5 + (1 - prof) * 0.3, 0.85, 0.85 - prof * 0.15);
    poeira.m.opacity = 0.22 + 0.1 * Math.sin(t * 0.5);
    {
      const pp = poeira.g.attributes.position.array;
      for (let i = 0; i < poeira.N; i++) {
        pp[i * 3] = poeira.base[i * 3] + Math.sin(t * 0.4 + i) * 1.4 * fMov;
        pp[i * 3 + 1] = poeira.base[i * 3 + 1] + Math.sin(t * 0.7 + i * 0.7) * 0.4 * fMov;
      }
      poeira.g.attributes.position.needsUpdate = true;
    }

    /* neve marinha */
    neve.m.opacity = Math.max(0, (prof - 0.55) * 1.8);
    neve.p.visible = neve.m.opacity > 0.005;
    if (neve.p.visible) {
      /* acesso direto ao Float32Array, como no resto do arquivo — getY/setY
         passam por bounds-check e chamada de método por partícula. */
      const np = neve.g.attributes.position.array;
      for (let i = 0; i < neve.N; i++) {
        const idx = i * 3 + 1;
        let y = np[idx] - dt * 1.1 * fMov;
        if (y < -PROF - 6) y = -80;
        np[idx] = y;
      }
      neve.g.attributes.position.needsUpdate = true;
    }

    /* krill */
    cardume.p.material.opacity = Math.max(0, 0.78 - prof * 2.3);
    cardume.p.visible = cardume.p.material.opacity > 0.005;
    if (cardume.p.visible) {
      const pp2 = cardume.g.attributes.position.array;
      for (let k = 0; k < cardume.K; k++) {
        const grupo = cardume.meta[k * 4];
        const fase = cardume.meta[k * 4 + 1];
        const vel = cardume.meta[k * 4 + 2];
        const amp = cardume.meta[k * 4 + 3];
        const g = cardume.grupos[grupo];
        const driftX = Math.sin(t * 0.18 + g.phase) * 4.2 + Math.sin(t * 0.43 + fase) * amp;
        const driftY = Math.cos(t * 0.22 + g.phase) * 2.4 + Math.sin(t * 0.9 + fase) * 0.42;
        for (let q = 0; q < cardume.ptsPorKrill; q++) {
          const i = k * cardume.ptsPorKrill + q;
          const idx = i * 3;
          const wiggle = Math.sin(t * (2.1 + vel) + fase + q * 0.7) * (0.16 + q * 0.03);
          pp2[idx] = g.cx + cardume.off[idx] + driftX + wiggle * fMov;
          pp2[idx + 1] = g.cy + cardume.off[idx + 1] + driftY + Math.cos(t * (1.7 + vel) + fase + q) * 0.18 * fMov;
          pp2[idx + 2] = cardume.off[idx + 2] + Math.sin(t * 0.8 + fase) * 0.55 * fMov;
        }
      }
      cardume.g.attributes.position.needsUpdate = true;
      cardume.p.rotation.z = Math.sin(t * 0.13) * -0.035;
    }

    /* habitantes do leito */
    coraisFundo.forEach((coral) => {
      const positions = coral.geo.attributes.position.array;
      const visibility = Math.max(0, Math.min(0.92, (prof - 0.58) * 2.7));
      coral.p.material.opacity = visibility;
      coral.p.visible = visibility > 0.005;
      if (!coral.p.visible) return;
      coral.p.rotation.z = coral.baseRotation + Math.sin(t * coral.speed + coral.phase) * 0.012 * fMov;
      for (let j = 0; j < positions.length; j += 3) {
        const heightRatio = Math.max(0, coral.base[j + 1] / coral.maxHeight);
        const flex = heightRatio * heightRatio;
        const current = Math.sin(t * coral.speed + coral.phase + coral.base[j + 1] * 0.12);
        positions[j] = coral.base[j] + current * coral.sway * flex * fMov;
        positions[j + 1] = coral.base[j + 1] + Math.cos(t * coral.speed * 0.7 + coral.phase) * 0.018 * flex * fMov;
        positions[j + 2] = coral.base[j + 2] + Math.cos(t * coral.speed + coral.phase + coral.base[j] * 0.09) * coral.sway * 0.28 * flex * fMov;
      }
      coral.geo.attributes.position.needsUpdate = true;
    });

    habitantesFundo.forEach((hb, hi) => {
      if (hb.tipo !== 'caranguejo') return;
      const crawl = Math.sin(t * hb.vel + hb.fase);
      hb.obj.position.x = hb.x0 + crawl * 4.2;
      hb.obj.position.z = hb.z0 + Math.cos(t * hb.vel * 0.8 + hb.fase) * 0.45;
      hb.obj.rotation.z = Math.sin(t * hb.vel * 1.4 + hb.fase) * 0.018;
      hb.obj.material.opacity = Math.max(0, Math.min(0.82, (prof - 0.62) * 2.4));
      const fp = hb.geo.attributes.position.array;
      const b = hb.base;
      const limb = hb.legLimb, legPhase = hb.legPhase, legSide = hb.legSide;
      const idlePhase = hb.fase + hi;
      for (let i = 0, j = 0; j < fp.length; j += 3, i++) {
        if (limb[i]) {
          const gait = Math.sin(t * 6.4 + legPhase[i]);
          const contact = Math.max(0, -gait);
          fp[j] = b[j] + gait * 0.07;
          fp[j + 1] = b[j + 1] + legSide[i] * (gait * 0.045 + contact * 0.035);
          fp[j + 2] = b[j + 2] + Math.max(0, gait) * 0.035;
        } else {
          fp[j] = b[j];
          fp[j + 1] = b[j + 1] + Math.sin(t * 2.1 + idlePhase) * 0.006;
          fp[j + 2] = b[j + 2];
        }
      }
      hb.geo.attributes.position.needsUpdate = true;
    });

    /* criaturas — são sempre os mesmos 13 objetos e as mesmas 1.248
       partículas; somente seus destinos e cores mudam com a profundidade. */
    let cursorSobreAlgumPeixe = false;
    criaturas.forEach((cr, ci) => {
      const o = cr.obj;
      if (cr.transicao) {
        /* A distância é normalizada pelo tamanho do visor: ~0 representa o
           centro e ~1 uma borda. Nuvens afastadas correm para alcançar a
           visão; perto do usuário, a reconstrução desacelera para ser lida. */
        const fatorDistancia = THREE.MathUtils.clamp(
          0.3 + (cr.distanciaVisao ?? 1) * 0.85,
          0.35,
          2.4,
        );
        cr.transicao.progresso = Math.min(
          1,
          cr.transicao.progresso + (dt * fatorDistancia) / cr.transicao.duracao,
        );
        if (cr.transicao.progresso >= 1) {
          const configDestino = cr.formas[cr.transicao.destino].config;
          configDestino.fase = cr.transicao.angulo - t * configDestino.vel * fMov;
          cr.zonaAtual = cr.transicao.destino;
          cr.transicao = null;
        }
      }

      const zonaA = cr.transicao?.origem ?? cr.zonaAtual;
      const zonaB = cr.transicao?.destino ?? cr.zonaAtual;
      const indiceTransicao = cr.transicao ? Math.min(zonaA, zonaB) : -1;
      const progressoCru = cr.transicao?.progresso ?? 0;
      const misturaZona = progressoCru * progressoCru * (3 - 2 * progressoCru);

      const formaA = cr.formas[zonaA], formaB = cr.formas[zonaB];
      const cfgA = formaA.config, cfgB = formaB.config;
      const vel = lerp(cfgA.vel, cfgB.vel, misturaZona);
      const fase = lerp(cfgA.fase, cfgB.fase, misturaZona);
      const raio = lerp(cfgA.raio, cfgB.raio, misturaZona);
      const yC = lerp(cfgA.y, cfgB.y, misturaZona);
      const zC = lerp(cfgA.z, cfgB.z, misturaZona);
      const grupoX = lerp(cfgA.grupoX, cfgB.grupoX, misturaZona);
      const grupoY = lerp(cfgA.grupoY, cfgB.grupoY, misturaZona);
      /* Durante o morph a órbita é congelada no ângulo da colisão. Assim a
         nuvem cruza o visor em linha, em vez de carregar as partículas pelo
         percurso elíptico do peixe e produzir a impressão de uma hélice. */
      const aLivre = t * vel * fMov + fase;
      const a = cr.transicao?.angulo ?? aLivre;
      const faseAnimacao = cr.transicao?.angulo ?? fase;
      const rx = raio * (1 + 0.14 * Math.sin(a * 0.7 + ci));
      const ry = raio * 0.34;
      const x = Math.cos(a) * rx, y = yC + Math.sin(a) * ry;
      const a2 = a + 0.03;
      const nx2 = Math.cos(a2) * rx, ny2 = yC + Math.sin(a2) * ry;
      const bob = Math.sin(t * 0.8 + ci) * 0.25;
      const zDrift = Math.sin(a * 0.5 + ci) * 2;
      o.position.set(x + grupoX, y + grupoY + bob, zC + zDrift);
      const rumo = Math.atan2(ny2 - y, nx2 - x);
      const cossenoRumo = Math.cos(rumo);
      const senoRumo = Math.sin(rumo);
      o.rotation.z = rumo;
      o.scale.y = cossenoRumo < 0 ? -1 : 1;
      o.material.opacity = lerp(cfgA.op, cfgB.op, misturaZona);
      o.material.size = lerp(cfgA.tam, cfgB.tam, misturaZona);

      function iniciarTransicao(destino) {
        cr.transicao = {
          origem: cr.zonaAtual,
          destino,
          progresso: 0,
          duracao: DURACAO_TRANSICAO,
          angulo: a,
        };
      }

      const distanciaCamera = Math.abs(cam.position.z - o.position.z);
      const metadeAlturaVisivel = tanMetadeFov * distanciaCamera;
      const metadeLarguraVisivel = metadeAlturaVisivel * cam.aspect;
      const bordaSuperior = cam.position.y + metadeAlturaVisivel;
      const bordaInferior = cam.position.y - metadeAlturaVisivel;
      const margemPeixe = 18;
      const pertoDoVisor =
        o.position.x + margemPeixe >= cam.position.x - metadeLarguraVisivel &&
        o.position.x - margemPeixe <= cam.position.x + metadeLarguraVisivel &&
        o.position.y + margemPeixe >= bordaInferior &&
        o.position.y - margemPeixe <= bordaSuperior;

      let cursorSobrePeixe = false;
      if (hoverDisponivel && mouse.ativo && pertoDoVisor && !cr.transicao && o.material.opacity > 0.05) {
        /* Intersecta o raio do cursor com o plano de profundidade do peixe.
           Usar o plano z=0 faria o hover ficar deslocado nos peixes mais
           profundos por causa da perspectiva. */
        const distanciaRaio = (o.position.z - cam.position.z) / mouseMundoDir.z;
        const cursorX = cam.position.x + mouseMundoDir.x * distanciaRaio;
        const cursorY = cam.position.y + mouseMundoDir.y * distanciaRaio;
        const comprimentoA = cfgA.def.organico.len * cfgA.px;
        const comprimentoB = cfgB.def.organico.len * cfgB.px;
        const unidadesPorPixel = (metadeAlturaVisivel * 2) / Math.max(1, alturaViewport);
        const raioSubmarino = unidadesPorPixel * 25;
        const raioHover = Math.max(3.8, lerp(comprimentoA, comprimentoB, misturaZona) * 0.72)
          + raioSubmarino;
        cursorSobrePeixe = Math.hypot(cursorX - o.position.x, cursorY - o.position.y) <= raioHover;
        if (cursorSobrePeixe) {
          const dxCursor = cursorX - o.position.x;
          const dyCursor = cursorY - o.position.y;
          /* Inverso da rotação/espelho do objeto: o campo acompanha o ponto
             correto da silhueta mesmo enquanto o peixe muda de direção. */
          cr.hoverLocalX = dxCursor * cossenoRumo + dyCursor * senoRumo;
          cr.hoverLocalY = (-dxCursor * senoRumo + dyCursor * cossenoRumo) / o.scale.y;
        }
      }
      const entrouNoHover = cursorSobrePeixe && !cr.cursorSobre;
      cr.cursorSobre = cursorSobrePeixe;
      if (cursorSobrePeixe) cursorSobreAlgumPeixe = true;
      cr.hoverPulso = entrouNoHover ? 1 : Math.max(0, cr.hoverPulso - dt * 2.4);
      o.material.size *= 1 + cr.hoverPulso * 0.2;
      if (cursorSobrePeixe) cr.hoverEmMovimento = true;

      /* Um salto grande de rolagem pode levar o peixe inteiro para além da
         borda entre dois frames. Nesse caso o centro + margem confirma que a
         colisão aconteceu, sem obrigar a animar partículas já fora da tela. */
      if (!cr.transicao && direcaoRolagem > 0 && cr.zonaAtual < cr.formas.length - 1
          && o.position.y - margemPeixe >= bordaSuperior) {
        iniciarTransicao(cr.zonaAtual + 1);
      } else if (!cr.transicao && direcaoRolagem < 0 && cr.zonaAtual > 0
          && o.position.y + margemPeixe <= bordaInferior) {
        iniciarTransicao(cr.zonaAtual - 1);
      }

      o.visible = pertoDoVisor && o.material.opacity > 0.002;
      if (cr.brilho) cr.brilho.visible = pertoDoVisor;
      if (!pertoDoVisor) {
        if (cr.transicao) {
          cr.distanciaVisao = Math.hypot(
            (o.position.x - cam.position.x) / metadeLarguraVisivel,
            (o.position.y - cam.position.y) / metadeAlturaVisivel,
          );
        }
        /* Fora da tela não há ganho visual em integrar a mola quadro a
           quadro. Quando o efeito já terminou, libera o estado residual. */
        if (!cursorSobrePeixe) {
          cr.hoverOffset.fill(0);
          cr.hoverVelocidade.fill(0);
          cr.hoverEmMovimento = false;
        }
        return;
      }

      /* Interpola a forma e a paleta antes de aplicar a ondulação. As arrays
         têm o mesmo comprimento em todas as espécies porque pertencem aos
         slots fixos do pool. */
      const fp = cr.geo.attributes.position.array;
      const cp = cr.geo.attributes.color.array;
      const atualizaCor = Boolean(cr.transicao) || cr.zonaCor !== cr.zonaAtual;
      const dispersao = indiceTransicao >= 0 && !reduz ? cr.dispersoes[indiceTransicao] : null;
      /* A desmontagem ocupa só o começo da duração total; todo o tempo
         restante fica para a reconstrução lenta solicitada. Cada metade usa
         smoothstep próprio para não criar um tranco no ponto de encontro. */
      const progressoAbre = Math.min(1, progressoCru / FRACAO_DESMONTAGEM);
      const progressoFecha = Math.max(0, (progressoCru - FRACAO_DESMONTAGEM) / (1 - FRACAO_DESMONTAGEM));
      const abre = dispersao ? progressoAbre * progressoAbre * (3 - 2 * progressoAbre) : 0;
      const fecha = dispersao ? progressoFecha * progressoFecha * (3 - 2 * progressoFecha) : 0;
      const nuvem = dispersao
        ? (progressoCru < FRACAO_DESMONTAGEM ? abre : 1 - fecha)
        : 0;
      o.material.opacity *= 1 - nuvem * 0.22;
      const precisaMedirBorda = !cr.transicao && direcaoRolagem !== 0;
      const precisaMedirDistancia = Boolean(cr.transicao);
      let menorYParticula = Infinity;
      let maiorYParticula = -Infinity;
      let somaDistanciaQuadrada = 0;
      /* Converte as constantes do efeito canvas (normalmente calibradas por
         frame a 60Hz) para um passo independente da taxa de atualização. */
      const passoHover = Math.min(3, dt * 60);
      const atritoHover = Math.pow(0.91, passoHover);
      const easeOrigem = 1 - Math.pow(1 - 0.075, passoHover);
      const simulaHover = cursorSobrePeixe || cr.hoverEmMovimento;
      let maiorMovimentoHover = 0;
      for (let i = 0, j = 0; i < PARTICULAS_POR_PEIXE; i++, j += 3) {
        let bx, by, bz, corR, corG, corB;
        if (dispersao && progressoCru < FRACAO_DESMONTAGEM) {
          bx = lerp(formaA.base[j], dispersao.base[j], abre);
          by = lerp(formaA.base[j + 1], dispersao.base[j + 1], abre);
          bz = lerp(formaA.base[j + 2], dispersao.base[j + 2], abre);
          corR = lerp(formaA.cor[j], dispersao.cor[j], abre);
          corG = lerp(formaA.cor[j + 1], dispersao.cor[j + 1], abre);
          corB = lerp(formaA.cor[j + 2], dispersao.cor[j + 2], abre);
        } else if (dispersao) {
          bx = lerp(dispersao.base[j], formaB.base[j], fecha);
          by = lerp(dispersao.base[j + 1], formaB.base[j + 1], fecha);
          bz = lerp(dispersao.base[j + 2], formaB.base[j + 2], fecha);
          corR = lerp(dispersao.cor[j], formaB.cor[j], fecha);
          corG = lerp(dispersao.cor[j + 1], formaB.cor[j + 1], fecha);
          corB = lerp(dispersao.cor[j + 2], formaB.cor[j + 2], fecha);
        } else {
          bx = lerp(formaA.base[j], formaB.base[j], misturaZona);
          by = lerp(formaA.base[j + 1], formaB.base[j + 1], misturaZona);
          bz = lerp(formaA.base[j + 2], formaB.base[j + 2], misturaZona);
          corR = lerp(formaA.cor[j], formaB.cor[j], misturaZona);
          corG = lerp(formaA.cor[j + 1], formaB.cor[j + 1], misturaZona);
          corB = lerp(formaA.cor[j + 2], formaB.cor[j + 2], misturaZona);
        }
        const faseOnda = lerp(formaA.faseOnda[i], formaB.faseOnda[i], misturaZona);
        const ampOnda = lerp(formaA.ampOnda[i], formaB.ampOnda[i], misturaZona);
        fp[j] = bx;
        fp[j + 1] = by + Math.sin(t * 4.4 + faseAnimacao + faseOnda) * ampOnda * (1 - nuvem * 0.72)
          * fMov;
        fp[j + 2] = bz;
        if (simulaHover) {
          const h = i * 2;
          let offX = cr.hoverOffset[h];
          let offY = cr.hoverOffset[h + 1];
          let velX = cr.hoverVelocidade[h];
          let velY = cr.hoverVelocidade[h + 1];

          /* Mesma construção da referência: distância ao quadrado e força
             inversa negativa, portanto sempre apontando para fora do cursor. */
          const dxHover = fp[j] + offX - cr.hoverLocalX;
          const dyHover = fp[j + 1] + offY - cr.hoverLocalY;
          const distanciaQuadrada = dxHover * dxHover + dyHover * dyHover;
          const raioQuadrado = 36;
          if (cursorSobrePeixe && distanciaQuadrada < raioQuadrado) {
            const distancia = Math.sqrt(Math.max(0.12, distanciaQuadrada));
            const forca = -raioQuadrado / Math.max(0.35, distanciaQuadrada);
            const anguloCentro = i * 2.399963;
            const cosAngulo = distanciaQuadrada > 0.12 ? -dxHover / distancia : Math.cos(anguloCentro);
            const sinAngulo = distanciaQuadrada > 0.12 ? -dyHover / distancia : Math.sin(anguloCentro);
            /* O sinal da força já é negativo como no exemplo; inverter a
               direção acima mantém o resultado radial para fora. */
            const intensidade = entrouNoHover ? 0.038 : 0.024;
            velX += forca * cosAngulo * intensidade * passoHover;
            velY += forca * sinAngulo * intensidade * passoHover;
          }

          velX *= atritoHover;
          velY *= atritoHover;
          offX += velX * passoHover;
          offY += velY * passoHover;

          /* x += (originX - x) * ease, expresso em offsets cujo origin é 0. */
          offX = lerp(offX, 0, easeOrigem);
          offY = lerp(offY, 0, easeOrigem);

          cr.hoverOffset[h] = offX; cr.hoverOffset[h + 1] = offY;
          cr.hoverVelocidade[h] = velX; cr.hoverVelocidade[h + 1] = velY;
          maiorMovimentoHover = Math.max(
            maiorMovimentoHover,
            Math.abs(offX), Math.abs(offY), Math.abs(velX), Math.abs(velY),
          );
          fp[j] += offX;
          fp[j + 1] += offY;
        }
        if (atualizaCor) {
          cp[j] = corR; cp[j + 1] = corG; cp[j + 2] = corB;
        }

        /* Posição vertical real da partícula depois da rotação e do espelho
           do peixe. É esse extremo — não a profundidade da página nem o
           centro do objeto — que toca a borda do visor. */
        if (precisaMedirBorda || precisaMedirDistancia) {
          const mundoX = o.position.x + fp[j] * cossenoRumo - fp[j + 1] * o.scale.y * senoRumo;
          const mundoY = o.position.y + fp[j] * senoRumo + fp[j + 1] * o.scale.y * cossenoRumo;
          if (precisaMedirBorda) {
            menorYParticula = Math.min(menorYParticula, mundoY);
            maiorYParticula = Math.max(maiorYParticula, mundoY);
          }
          if (precisaMedirDistancia) {
            const dxVisor = (mundoX - cam.position.x) / metadeLarguraVisivel;
            const dyVisor = (mundoY - cam.position.y) / metadeAlturaVisivel;
            somaDistanciaQuadrada += dxVisor * dxVisor + dyVisor * dyVisor;
          }
        }
      }
      if (simulaHover && !cursorSobrePeixe && maiorMovimentoHover < 0.002) {
        cr.hoverEmMovimento = false;
        cr.hoverOffset.fill(0);
        cr.hoverVelocidade.fill(0);
      }
      if (precisaMedirDistancia) {
        cr.distanciaVisao = Math.sqrt(somaDistanciaQuadrada / PARTICULAS_POR_PEIXE);
      }
      cr.geo.attributes.position.needsUpdate = true;
      if (atualizaCor) {
        cr.geo.attributes.color.needsUpdate = true;
        if (!cr.transicao) cr.zonaCor = cr.zonaAtual;
      }

      if (precisaMedirBorda) {
        const descendoETocouTopo = direcaoRolagem > 0
          && cr.zonaAtual < cr.formas.length - 1
          && maiorYParticula >= bordaSuperior;
        const subindoETocouBase = direcaoRolagem < 0
          && cr.zonaAtual > 0
          && menorYParticula <= bordaInferior;
        if (descendoETocouTopo || subindoETocouBase) {
          iniciarTransicao(cr.zonaAtual + (descendoETocouTopo ? 1 : -1));
        }
      }

      if (cr.brilho) {
        const brilhoX = lerp(cfgA.brilhoOff.x, cfgB.brilhoOff.x, misturaZona);
        const brilhoY = lerp(cfgA.brilhoOff.y, cfgB.brilhoOff.y, misturaZona) * o.scale.y;
        cr.brilho.position.set(
          o.position.x + brilhoX * cossenoRumo - brilhoY * senoRumo,
          o.position.y + brilhoX * senoRumo + brilhoY * cossenoRumo,
          o.position.z + 0.2,
        );
        const brilhoOp = lerp(cfgA.brilhoOp, cfgB.brilhoOp, misturaZona);
        const brilhoTam = lerp(cfgA.brilhoTam, cfgB.brilhoTam, misturaZona);
        cr.brilho.scale.set(brilhoTam, brilhoTam, 1);
        cr.brilho.material.opacity = Math.max(0, brilhoOp * 0.7 + Math.sin(t * 3 + faseAnimacao) * Math.min(0.18, brilhoOp * 0.3)) * (1 - nuvem);
      }
    });

    /* bolhas */
    acum += dt;
    if (acum > 1.6 && !reduz) { acum = 0; soltarBolha(rnd(-LARG, LARG), camY - 26, rnd(-10, 4)); }
    for (let i = bolhas.length - 1; i >= 0; i--) {
      const bo = bolhas[i]; bo.vida -= dt;
      bo.s.position.y += bo.vel * dt;
      bo.s.position.x += Math.sin(t * 3 + bo.fase) * 0.02;
      bo.s.material.opacity = Math.min(0.8, bo.vida);
      if (bo.vida <= 0) { scene.remove(bo.s); bo.s.material.dispose(); bolhas.splice(i, 1); }
    }
    for (let i = explosoes.length - 1; i >= 0; i--) {
      const explosao = explosoes[i];
      explosao.vida -= dt;
      const posicoes = explosao.geometria.attributes.position.array;
      const atrito = Math.exp(-2.8 * dt);
      for (let j = 0; j < posicoes.length; j += 3) {
        posicoes[j] += explosao.velocidades[j] * dt;
        posicoes[j + 1] += explosao.velocidades[j + 1] * dt;
        posicoes[j + 2] += explosao.velocidades[j + 2] * dt;
        explosao.velocidades[j] *= atrito;
        explosao.velocidades[j + 1] *= atrito;
        explosao.velocidades[j + 2] *= atrito;
      }
      explosao.geometria.attributes.position.needsUpdate = true;
      explosao.material.opacity = Math.max(0, explosao.vida / 0.82);
      if (explosao.vida <= 0) {
        scene.remove(explosao.pontos);
        explosao.geometria.dispose();
        explosao.material.dispose();
        explosoes.splice(i, 1);
      }
    }
    renderer.render(scene, cam);

    return {
      prof,
      bgDepth,
      bgSurface,
      backgroundCss,
      fishHovered: cursorSobreAlgumPeixe,
    };
  }

  function dispose() {
    disposeSceneResources(scene);
    /* `disposeSceneResources` só alcança texturas de materiais que estejam na
       cena. A das bolhas é compartilhada por sprites efêmeros: se nenhuma bolha
       estiver viva no momento da desmontagem, ela vazaria a cada troca de rota. */
    texBolhaP.dispose();
    renderer.dispose();
  }

  return { resize, setPointerNDC, clearPointer, handleTorpedoStep, setScrollProgress, prepare, update, dispose };
}
