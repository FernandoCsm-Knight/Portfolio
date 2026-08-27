import { memo, useLayoutEffect, useRef } from 'react';
import { FaBrain, FaNetworkWired } from 'react-icons/fa6';
import {
  SiCplusplus,
  SiNvidia,
  SiPython,
  SiPytorch,
  SiReact,
  SiRust,
  SiTypescript,
} from 'react-icons/si';
import { SKILLS } from '../../data/skills';
import { useI18n } from '../../i18n/context';

const ICONES = [
  SiCplusplus,
  SiNvidia,
  SiPython,
  SiPytorch,
  SiTypescript,
  SiReact,
  SiRust,
  FaBrain,
  FaNetworkWired,
];

const CORES = [
  ['#9edbd5', 'rgba(158,219,213,.12)', 'rgba(158,219,213,.28)'],
  ['#d8b7ec', 'rgba(216,183,236,.12)', 'rgba(216,183,236,.28)'],
  ['#a9c9ef', 'rgba(169,201,239,.12)', 'rgba(169,201,239,.28)'],
  ['#efafa8', 'rgba(239,175,168,.11)', 'rgba(239,175,168,.27)'],
  ['#f0ce9f', 'rgba(240,206,159,.11)', 'rgba(240,206,159,.27)'],
  ['#9ed8b2', 'rgba(158,216,178,.11)', 'rgba(158,216,178,.27)'],
  ['#c1b5ed', 'rgba(193,181,237,.12)', 'rgba(193,181,237,.28)'],
  ['#ebb8d2', 'rgba(235,184,210,.11)', 'rgba(235,184,210,.27)'],
  ['#add5e7', 'rgba(173,213,231,.12)', 'rgba(173,213,231,.28)'],
];

function criarConfiguracaoAleatoria(total) {
  const nos = [];
  for (let index = 0; index < total; index++) {
    let x;
    let y;
    let tentativas = 0;
    do {
      x = 10 + Math.random() * 80;
      y = 12 + Math.random() * 76;
      tentativas++;
    } while (
      tentativas < 180
      && nos.some((no) => Math.hypot(x - no.x, y - no.y) < 20)
    );
    nos.push({ x, y, vx: 0, vy: 0, arrastando: false });
  }
  return nos;
}

const CONEXOES = [
  /* C++: CUDA, Python, Rust e computação paralela. */
  [0, 1], [0, 2], [0, 6], [0, 8],
  /* Python: PyTorch e aprendizado profundo/IA. */
  [2, 3], [2, 7],
  /* Relações complementares dentro de cada especialidade. */
  [1, 8], [3, 7], [4, 5], [6, 8],
];

function About() {
  const { t } = useI18n();
  const skills = t('skills');
  const grafoRef = useRef(null);
  const nosRef = useRef([]);
  const arestasRef = useRef([]);
  const configuracaoRef = useRef(null);
  if (!configuracaoRef.current) configuracaoRef.current = criarConfiguracaoAleatoria(SKILLS.length);
  const configuracao = configuracaoRef.current;

  /* useLayoutEffect e não useEffect: os nós não têm mais `left`/`top` no JSX,
     então é este primeiro renderizar() que os tira do canto superior esquerdo
     — e ele precisa acontecer antes da primeira pintura. */
  useLayoutEffect(() => {
    const grafo = grafoRef.current;
    const nos = configuracaoRef.current;
    if (!grafo || !nos) return undefined;
    let arrastado = null;
    let rafId = null;
    let visivel = true;
    let ultimoInstante = performance.now();
    const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* As porcentagens do simulador viram pixels aqui porque a posição sai por
       `transform`: escrever `left`/`top` a 60fps obrigava o navegador a
       refazer o layout dos 9 nós a cada quadro — era, sozinho, metade de todo
       o recálculo de estilo da página durante a rolagem. */
    let caixa = { largura: grafo.clientWidth, altura: grafo.clientHeight };
    function medirCaixa() {
      caixa = { largura: grafo.clientWidth, altura: grafo.clientHeight };
    }
    const observadorCaixa = new ResizeObserver(() => {
      medirCaixa();
      renderizar();
    });
    observadorCaixa.observe(grafo);

    function renderizar() {
      nos.forEach((no, index) => {
        const elemento = nosRef.current[index];
        if (!elemento) return;
        elemento.style.transform = `translate(-50%,-50%) translate(${
          (no.x / 100) * caixa.largura}px,${(no.y / 100) * caixa.altura}px)`;
        const rotulo = no.x < 30 ? '-15%' : no.x > 70 ? '-85%' : '-50%';
        if (no.rotulo !== rotulo) {
          no.rotulo = rotulo;
          elemento.style.setProperty('--rotulo-x', rotulo);
        }
      });
      CONEXOES.forEach(([origem, destino], index) => {
        const aresta = arestasRef.current[index];
        if (!aresta) return;
        aresta.setAttribute('x1', nos[origem].x);
        aresta.setAttribute('y1', nos[origem].y);
        aresta.setAttribute('x2', nos[destino].x);
        aresta.setAttribute('y2', nos[destino].y);
      });
    }

    function simular(agora) {
      const passo = Math.min(2, (agora - ultimoInstante) / (1000 / 60));
      ultimoInstante = agora;
      const forcas = nos.map((no) => ({
        x: (50 - no.x) * 0.0012,
        y: (50 - no.y) * 0.0012,
      }));

      for (let a = 0; a < nos.length; a++) {
        for (let b = a + 1; b < nos.length; b++) {
          const dx = nos[b].x - nos[a].x;
          const dy = nos[b].y - nos[a].y;
          const distancia = Math.max(0.1, Math.hypot(dx, dy));
          if (distancia >= 34) continue;
          const repulsao = (34 - distancia) * 0.007;
          const fx = (dx / distancia) * repulsao;
          const fy = (dy / distancia) * repulsao;
          forcas[a].x -= fx; forcas[a].y -= fy;
          forcas[b].x += fx; forcas[b].y += fy;
        }
      }

      CONEXOES.forEach(([origem, destino]) => {
        const a = nos[origem];
        const b = nos[destino];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distancia = Math.max(0.1, Math.hypot(dx, dy));
        const elastico = (distancia - 29) * 0.0035;
        const fx = (dx / distancia) * elastico;
        const fy = (dy / distancia) * elastico;
        forcas[origem].x += fx; forcas[origem].y += fy;
        forcas[destino].x -= fx; forcas[destino].y -= fy;
      });

      let emMovimento = false;
      nos.forEach((no, index) => {
        if (no.arrastando) {
          emMovimento = true;
          return;
        }
        no.vx = (no.vx + forcas[index].x * passo) * Math.pow(0.9, passo);
        no.vy = (no.vy + forcas[index].y * passo) * Math.pow(0.9, passo);
        no.x = Math.min(92, Math.max(8, no.x + no.vx * passo));
        no.y = Math.min(91, Math.max(9, no.y + no.vy * passo));
        if (Math.abs(no.vx) > 0.004 || Math.abs(no.vy) > 0.004) emMovimento = true;
      });
      renderizar();
      /* O grafo converge para um equilíbrio e depois só treme abaixo de um
         décimo de pixel: continuar pedindo quadros a partir daí é custo puro
         numa aba que o visitante provavelmente já rolou para longe. */
      rafId = emMovimento ? requestAnimationFrame(simular) : null;
    }

    function pedirQuadro() {
      if (rafId !== null || !visivel || reduzMovimento) return;
      ultimoInstante = performance.now();
      rafId = requestAnimationFrame(simular);
    }

    function pararQuadros() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    }

    /* Fora da tela a simulação não tem espectador — e a home tem três telas de
       rolagem, então ela passa a maior parte do tempo fora de vista. */
    const observadorVisibilidade = new IntersectionObserver(([entrada]) => {
      visivel = entrada.isIntersecting;
      if (visivel) pedirQuadro();
      else pararQuadros();
    }, { rootMargin: '150px' });
    observadorVisibilidade.observe(grafo);

    function posicionarArrastado(event) {
      if (arrastado === null) return;
      const rect = grafo.getBoundingClientRect();
      const no = nos[arrastado];
      no.x = Math.min(92, Math.max(8, ((event.clientX - rect.left) / rect.width) * 100));
      no.y = Math.min(91, Math.max(9, ((event.clientY - rect.top) / rect.height) * 100));
      no.vx = 0;
      no.vy = 0;
      renderizar();
    }

    function iniciarArraste(event) {
      const elemento = event.target instanceof Element
        ? event.target.closest('[data-node-index]')
        : null;
      if (!elemento || !grafo.contains(elemento)) return;
      event.preventDefault();
      arrastado = Number(elemento.dataset.nodeIndex);
      nos[arrastado].arrastando = true;
      elemento.classList.add('arrastando');
      posicionarArrastado(event);
      /* o laço pode ter parado por convergência: arrastar precisa acordá-lo */
      pedirQuadro();
    }

    function encerrarArraste() {
      if (arrastado === null) return;
      nos[arrastado].arrastando = false;
      nosRef.current[arrastado]?.classList.remove('arrastando');
      arrastado = null;
      pedirQuadro();
    }

    grafo.addEventListener('pointerdown', iniciarArraste);
    window.addEventListener('pointermove', posicionarArrastado);
    window.addEventListener('pointerup', encerrarArraste);
    window.addEventListener('pointercancel', encerrarArraste);
    renderizar();
    pedirQuadro();

    return () => {
      pararQuadros();
      observadorCaixa.disconnect();
      observadorVisibilidade.disconnect();
      grafo.removeEventListener('pointerdown', iniciarArraste);
      window.removeEventListener('pointermove', posicionarArrastado);
      window.removeEventListener('pointerup', encerrarArraste);
      window.removeEventListener('pointercancel', encerrarArraste);
    };
  }, []);

  return (
    <section id="sobre" className="secao-grafo-habilidades" aria-label={t('hero.skillsGraph')}>
      <div ref={grafoRef} className="grafo-habilidades">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {CONEXOES.map(([origem, destino], index) => (
            <line
              key={`${origem}-${destino}`}
              ref={(elemento) => { arestasRef.current[index] = elemento; }}
              x1={configuracao[origem].x}
              y1={configuracao[origem].y}
              x2={configuracao[destino].x}
              y2={configuracao[destino].y}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <ul>
          {skills.map((skill, index) => (
            (() => {
              const Icone = ICONES[index];
              const [cor, brilho, borda] = CORES[index];
              const { x } = configuracao[index];
              const rotuloX = x < 30 ? '-15%' : x > 70 ? '-85%' : '-50%';
              return (
                <li
                  key={skill}
                  className={index === 0 ? 'habilidade-nucleo' : undefined}
                  aria-label={skill}
                  data-label={skill}
                  data-alvo
                  data-node-index={index}
                  ref={(elemento) => { nosRef.current[index] = elemento; }}
                  tabIndex="0"
                  style={{
                    /* a posição vem por `transform`, escrita pelo laço da
                       simulação — ver renderizar() */
                    '--cor-no': cor,
                    '--brilho-no': brilho,
                    '--borda-no': borda,
                    '--rotulo-x': rotuloX,
                  }}
                >
                  <Icone aria-hidden="true" />
                </li>
              );
            })()
          ))}
        </ul>
      </div>
    </section>
  );
}

export default memo(About);
