import { DEPTH_STOPS } from './constants';

/**
 * Fundo da home em camadas fixas que só mudam de opacidade.
 *
 * Antes o gradiente inteiro era remontado como string e reescrito no
 * `background` de #fundo — um repaint da tela toda a cada troca. Por isso ele
 * só era atualizado a cada 20 quadros, e no celular o brilho descia em degraus
 * visíveis. Aqui cada camada tem um gradiente estático (pintado uma vez) e a
 * profundidade só mexe em `opacity`, que o navegador resolve na composição,
 * sem repintar: dá para atualizar em todo quadro.
 *
 * A cor de base varia continuamente com a profundidade, então ela é feita por
 * duas camadas em crossfade entre "chaves" de profundidade. O gradiente só é
 * reescrito ao cruzar uma chave (8 vezes na descida inteira).
 */

const PARADAS = DEPTH_STOPS.map(([t, hex]) => {
  const n = parseInt(hex.slice(1), 16);
  return [t, (n >> 16) & 255, (n >> 8) & 255, n & 255];
});

function corProf(t) {
  for (let i = 0; i < PARADAS.length - 1; i++) {
    const [a, ar, ag, ab] = PARADAS[i];
    const [b, br, bg, bb] = PARADAS[i + 1];
    if (t <= b) {
      const f = (t - a) / (b - a);
      return `rgb(${Math.round(ar + (br - ar) * f)},${Math.round(ag + (bg - ag) * f)},${Math.round(ab + (bb - ab) * f)})`;
    }
  }
  const [, r, g, b] = PARADAS[PARADAS.length - 1];
  return `rgb(${r},${g},${b})`;
}

/* Mesmo desenho do gradiente antigo: topo da tela na profundidade atual e a
   base um pouco mais funda. */
function gradienteBase(prof) {
  return `linear-gradient(164deg, ${corProf(prof)} 0%, ${corProf(Math.min(1, prof + 0.1))} 48%, ${corProf(Math.min(1, prof + 0.26))} 100%)`;
}

const CHAVES = 8;

export function criarFundoOceano(raiz) {
  raiz.classList.add('fundo-oceano');
  const camadas = [];
  function criar(classe) {
    const el = document.createElement('div');
    el.className = `fundo-camada ${classe}`;
    raiz.appendChild(el);
    camadas.push(el);
    return el;
  }
  /* Ordem de baixo para cima. */
  const baseA = criar('fundo-base');
  const baseB = criar('fundo-base');
  const escuro = criar('fundo-escuro');
  const deriva = criar('fundo-deriva');
  const superficie = criar('fundo-superficie');

  const ultimaOpacidade = new Map();
  function opacidade(el, valor) {
    const v = Math.round(Math.min(1, Math.max(0, valor)) * 1000) / 1000;
    if (ultimaOpacidade.get(el) === v) return;
    ultimaOpacidade.set(el, v);
    el.style.opacity = String(v);
    /* Camada invisível sai da composição em vez de ser misturada à toa. */
    el.style.visibility = v === 0 ? 'hidden' : '';
  }

  let chave = -1;
  function update(prof) {
    const posicao = prof * CHAVES;
    const k = Math.min(CHAVES - 1, Math.floor(posicao));
    if (k !== chave) {
      chave = k;
      baseA.style.background = gradienteBase(k / CHAVES);
      baseB.style.background = gradienteBase((k + 1) / CHAVES);
    }
    opacidade(baseB, posicao - k);
    opacidade(superficie, 1 - prof);
    opacidade(deriva, 1 - prof * 0.7);
    opacidade(escuro, prof);
  }

  function dispose() {
    camadas.forEach((el) => el.remove());
    raiz.classList.remove('fundo-oceano');
  }

  return { update, dispose };
}
