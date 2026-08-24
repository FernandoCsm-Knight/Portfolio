import * as THREE from 'three';
import { rnd } from '../ocean/utils';

/* Faixas de altura usadas para o balanço. O movimento varia de forma contínua
   da base (presa à rocha) ao topo (solto na corrente), mas calcular um seno
   por vértice seria desperdício: 10 faixas por planta dão um degradê
   visualmente contínuo com ~180 senos por frame, e cada vértice sai com uma
   multiplicação e uma soma. */
const FAIXAS = 10;
const PLANTAS = 9;
const SEGMENTOS = 40;
const AMOSTRAS_LAMINA = 10;
const AMOSTRAS_NERVURA = 6;
const LAMINA_A_CADA = 3;

/* A câmera desce 46 unidades e enxerga ~48 de altura, então o ponto visível
   mais baixo fica em torno de y = -72. Os caules nascem bem abaixo disso para
   entrarem na tela já vindos do fundo, em vez de começarem no meio do nada. */
const ANCORAGEM = [-106, -92];

const PALETAS = [
  { base: '#4a3a15', meio: '#b0862c', ponta: '#e7d3a8' },
  { base: '#3d4a1a', meio: '#94a83a', ponta: '#d8e08e' },
  { base: '#523f18', meio: '#c69749', ponta: '#f0dfa8' },
  { base: '#2f4a2a', meio: '#6f9a45', ponta: '#c3d97e' },
];

/* Cada buffer (malha e linhas) carrega, por vértice, de qual planta e de qual
   faixa ele veio — é o que permite deslocar tudo em conjunto sem recalcular a
   geometria. */
function criarAcumulador() {
  return { pos: [], cor: [], planta: [], faixa: [], amp: [], indices: [] };
}

function empurrar(acc, x, y, z, cor, planta, faixa, amp) {
  acc.pos.push(x, y, z);
  acc.cor.push(cor.r, cor.g, cor.b);
  acc.planta.push(planta);
  acc.faixa.push(faixa);
  acc.amp.push(amp);
  return acc.pos.length / 3 - 1;
}

function aplicarAtributos(geometria, acc) {
  geometria.setAttribute('position', new THREE.BufferAttribute(new Float32Array(acc.pos), 3));
  geometria.setAttribute('color', new THREE.BufferAttribute(new Float32Array(acc.cor), 3));
  if (acc.indices.length) geometria.setIndex(acc.indices);
  return {
    base: new Float32Array(acc.pos),
    planta: new Uint8Array(acc.planta),
    faixa: new Uint8Array(acc.faixa),
    amp: new Float32Array(acc.amp),
    total: acc.pos.length / 3,
  };
}

/**
 * Floresta de kelp construída com geometria de verdade: caules e lâminas são
 * fitas trianguladas e as nervuras são linhas. Ponto isolado nunca lê como
 * folha larga — é o que faltava para a silhueta de kelp aparecer.
 */
export function makeKelpForest() {
  const malha = criarAcumulador();
  const linhas = criarAcumulador();
  const plantas = [];

  const corBase = new THREE.Color();
  const corMeio = new THREE.Color();
  const corPonta = new THREE.Color();
  const cor = new THREE.Color();

  /* Emite uma fita: dois vértices por amostra, deslocados na perpendicular à
     tangente, e dois triângulos ligando cada par ao seguinte. */
  function emitirFita(amostras, planta) {
    let anteriorEsq = -1;
    let anteriorDir = -1;
    for (let i = 0; i < amostras.length; i++) {
      const a = amostras[i];
      const anterior = amostras[Math.max(0, i - 1)];
      const proximo = amostras[Math.min(amostras.length - 1, i + 1)];
      let tx = proximo.x - anterior.x;
      let ty = proximo.y - anterior.y;
      const comprimento = Math.hypot(tx, ty) || 1;
      tx /= comprimento;
      ty /= comprimento;
      /* perpendicular no plano XY: é a direção em que a fita ganha largura */
      const nx = -ty * a.largura;
      const ny = tx * a.largura;

      const esq = empurrar(malha, a.x - nx, a.y - ny, a.z, a.cor, planta, a.faixa, a.amp);
      const dir = empurrar(malha, a.x + nx, a.y + ny, a.z, a.cor, planta, a.faixa, a.amp);
      if (anteriorEsq >= 0) {
        malha.indices.push(anteriorEsq, anteriorDir, esq);
        malha.indices.push(esq, anteriorDir, dir);
      }
      anteriorEsq = esq;
      anteriorDir = dir;
    }
  }

  for (let p = 0; p < PLANTAS; p++) {
    const paleta = PALETAS[Math.floor(Math.random() * PALETAS.length)];
    corBase.set(paleta.base);
    corMeio.set(paleta.meio);
    corPonta.set(paleta.ponta);

    /* z negativo = mais ao fundo: planta menor, mais pálida e mais lenta,
       o que cria a profundidade de floresta */
    const z = rnd(-26, 7);
    const distancia = (z + 26) / 33;
    const escala = 0.55 + distancia * 0.75;
    const xBase = rnd(-46, 46);
    const yBase = rnd(ANCORAGEM[0], ANCORAGEM[1]);
    /* a altura quase não depende da escala: uma planta ao fundo é mais fina e
       pálida, mas continua chegando à superfície — do contrário as distantes
       ficariam atarracadas, boiando no meio da tela */
    const altura = rnd(118, 168) * (0.85 + distancia * 0.25);
    const curvatura = rnd(3.5, 9) * escala;
    const faseCurva = rnd(0, Math.PI * 2);

    plantas.push({
      fase: rnd(0, Math.PI * 2),
      freq: rnd(0.22, 0.4),
      amp: rnd(1.5, 3.4) * escala,
    });

    /* — caule: fita estreita que afina conforme sobe — */
    const caule = [];
    for (let s = 0; s < SEGMENTOS; s++) {
      const t = s / (SEGMENTOS - 1);
      cor.copy(corBase).lerp(corMeio, t * 0.85);
      caule.push({
        x: xBase + Math.sin(t * Math.PI * 1.5 + faseCurva) * curvatura,
        y: yBase + t * altura,
        z,
        largura: (0.3 - t * 0.16) * escala,
        faixa: Math.min(FAIXAS - 1, Math.floor(t * FAIXAS)),
        amp: 1,
        cor: cor.clone(),
      });
    }
    emitirFita(caule, p);

    /* — lâminas — */
    for (let s = 0; s < SEGMENTOS; s++) {
      const t = s / (SEGMENTOS - 1);
      if (s % LAMINA_A_CADA !== 0 || t < 0.08) continue;

      const no = caule[s];
      const lado = s % (LAMINA_A_CADA * 2) === 0 ? 1 : -1;
      const comprimento = rnd(6.5, 13.5) * escala * (0.6 + t * 0.7);
      /* coeficiente menor que o comprimento cresceu: lâmina longa e esguia,
         como a da referência, e não uma pá arredondada */
      const larguraMax = (0.45 + comprimento * 0.085) * escala;
      const faseLamina = rnd(0, Math.PI * 2);

      const amostras = [];
      for (let b = 0; b < AMOSTRAS_LAMINA; b++) {
        const u = b / (AMOSTRAS_LAMINA - 1);
        cor.copy(corMeio).lerp(corPonta, u * 0.7 + t * 0.3);
        amostras.push({
          x: no.x + lado * comprimento * Math.sin(u * 1.35),
          /* sobe um pouco e depois tomba — o pendor das folhas da referência */
          y: no.y + comprimento * (0.42 * u - 0.95 * u * u),
          z: z + Math.sin(u * 2.1 + faseLamina) * 0.8 * escala,
          /* mais larga no meio, afinando até a ponta */
          largura: Math.sin(Math.pow(u, 0.72) * Math.PI) * larguraMax,
          faixa: no.faixa,
          amp: 0.9 + u * 0.7,
          cor: cor.clone(),
        });
      }
      emitirFita(amostras, p);

      /* nervura central, em linha: dá a dobra que a fita chapada não tem */
      cor.copy(corPonta).lerp(corMeio, 0.35);
      for (let n = 0; n < AMOSTRAS_NERVURA - 1; n++) {
        const u0 = n / (AMOSTRAS_NERVURA - 1);
        const u1 = (n + 1) / (AMOSTRAS_NERVURA - 1);
        for (const u of [u0, u1]) {
          const i = u * (AMOSTRAS_LAMINA - 1);
          const a = amostras[Math.round(i)];
          empurrar(linhas, a.x, a.y, a.z + 0.05, cor, p, a.faixa, a.amp);
        }
      }

    }
  }

  const grupo = new THREE.Group();

  const geoMalha = new THREE.BufferGeometry();
  const metaMalha = aplicarAtributos(geoMalha, malha);
  /* opaca de propósito: kelp é folhagem densa, e assim o próprio z-buffer
     resolve a oclusão entre lâminas — nada de ordenar transparência. Os raios
     de luz e a poeira, que são aditivos, entram depois por cima. */
  grupo.add(new THREE.Mesh(geoMalha, new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  })));

  const geoLinhas = new THREE.BufferGeometry();
  const metaLinhas = aplicarAtributos(geoLinhas, linhas);
  grupo.add(new THREE.LineSegments(geoLinhas, new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  })));

  const balanco = new Float32Array(PLANTAS * FAIXAS);
  const camadas = [
    { geometria: geoMalha, meta: metaMalha },
    { geometria: geoLinhas, meta: metaLinhas },
  ];

  function update(t, fMov) {
    for (let p = 0; p < PLANTAS; p++) {
      const planta = plantas[p];
      for (let f = 0; f < FAIXAS; f++) {
        const k = f / (FAIXAS - 1);
        /* k² deixa a base presa e o topo solto; a segunda onda, mais lenta,
           evita que a floresta inteira balance em uníssono */
        balanco[p * FAIXAS + f] =
          (Math.sin(t * planta.freq + planta.fase + k * 1.8) * 0.75 +
            Math.sin(t * planta.freq * 0.41 + planta.fase * 1.7) * 0.25) *
          k * k * planta.amp * fMov;
      }
    }

    for (const camada of camadas) {
      const { base, planta, faixa, amp, total } = camada.meta;
      const pos = camada.geometria.attributes.position.array;
      for (let i = 0; i < total; i++) {
        const idx = i * 3;
        const desvio = balanco[planta[i] * FAIXAS + faixa[i]] * amp[i];
        pos[idx] = base[idx] + desvio;
        pos[idx + 2] = base[idx + 2] + desvio * 0.32;
      }
      camada.geometria.attributes.position.needsUpdate = true;
    }
  }

  return { objeto: grupo, update };
}
