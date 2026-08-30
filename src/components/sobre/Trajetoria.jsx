import { createDraggable, createTimeline, stagger, text, utils, waapi } from 'animejs';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FaArrowRotateLeft, FaPause, FaPlay } from 'react-icons/fa6';
import { PERIODOS } from '../../data/sobre';
import { useI18n } from '../../i18n/context';

/* Duração da varredura inteira. Aqui isto é tempo de relógio de verdade: quem
   comanda a timeline é o visitante, pela régua e pelos botões, e não mais a
   rolagem da página. */
const DURACAO = 18000;

/* Rótulo de ano a menos de 12% da borda direita cairia em cima do "AGORA".
   A linha da grade continua sendo desenhada; só o texto é que sai. */
const FOLGA_ROTULO = 88;

/* Quadros de sustentação da caixa no palco. O wrapper WAAPI do anime.js
   distribui os quadros em intervalos iguais e não expõe `offset`, então é
   repetindo o valor aceso que se encurta a transição: com sete quadros, entrar
   e sair levam 1/6 da janela cada, em vez do 1/3 que três quadros dariam. */
const SUSTENTACAO = 5;

/* Tempo nominal da montagem do texto de uma caixa. Nunca passa de metade do
   trecho: a monitoria de 2023 dura pouco mais de um segundo na varredura, e uma
   entrada de tamanho fixo comeria o trecho inteiro. */
const ENTRADA = 650;

/* Vão entre as colunas do palco, em fração da largura dele. Porcentagem e não
   pixels de propósito: com o vão proporcional, andar uma coluna vira uma
   porcentagem fixa da largura do cartão — 110,87% para cinco colunas — a mesma
   em qualquer tela. É o que deixa recentrar o grupo ser só `translateX` em %,
   sem medir nada em pixels nem recalcular no resize. */
const VAO_CAIXAS = 0.02;

/* Tempo que uma caixa leva deslizando quando o grupo se recentra. */
const TRANSICAO = 500;

/* Escala inteira do `aria-valuenow` da régua. O progresso é um número de 0 a 1
   e o atributo pede algo legível; mil passos dão resolução de sobra. */
const PASSOS_ARIA = 1000;

/* 'AAAA-MM-DD' no fuso local. `new Date('2023-02-13')` seria lido como UTC e,
   a oeste de Greenwich, cairia no dia 12 — irrelevante para uma fração de ano,
   mas não custa nada ler a data como ela está escrita. */
function dataLocal(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/* Ano com a fração já decorrida — 30 de agosto de 2026 é 2026.66. É isso que
   faz a barra de uma etapa em curso parar em cima de hoje, e não no réveillon.
   Os três instantes saem do mesmo fuso, então a divisão é exata. */
function anoFracionario(data) {
  const ano = data.getFullYear();
  const inicio = new Date(ano, 0, 1).getTime();
  const fim = new Date(ano + 1, 0, 1).getTime();
  return ano + (data.getTime() - inicio) / (fim - inicio);
}

/* Coluna fixa de cada etapa no palco, por coloração gulosa de um grafo de
   intervalos: cada etapa toma a primeira coluna livre no instante em que
   começa. Duas etapas simultâneas nunca caem na mesma coluna, e o número de
   colunas sai igual ao máximo de coisas acontecendo ao mesmo tempo.

   É isto que deixa o palco parado: cada caixa tem largura e posição fixas para
   sempre, então aparecer e sumir é só opacidade — nenhuma caixa empurra ou
   redimensiona a outra, e a altura do palco (a da caixa mais alta naquela
   largura) sai calculada uma vez pelo próprio navegador, sem número mágico.

   O empacotamento usa o vão inteiro da etapa, e não trecho a trecho: durante os
   catorze meses parados da monitoria a coluna dela segue reservada, senão outra
   etapa a tomaria e as duas colidiriam quando ela voltasse. */
/* Quanto vale, em porcentagem da largura de um cartão, andar uma coluna.
   Largura da coluna = (1 - (N-1)v)/N da largura do palco, e o passo é ela mais
   um vão — a razão entre os dois não depende da largura da tela. */
function passoDeColuna(colunas) {
  return (1 + (VAO_CAIXAS * colunas) / (1 - VAO_CAIXAS * (colunas - 1))) * 100;
}

function distribuirColunas(etapas) {
  const ocupadaAte = [];
  const colunas = [];
  etapas
    .map((_, indice) => indice)
    .sort((a, b) => etapas[a].entra - etapas[b].entra)
    .forEach((indice) => {
      const etapa = etapas[indice];
      let coluna = ocupadaAte.findIndex((fim) => fim <= etapa.entra);
      if (coluna === -1) coluna = ocupadaAte.length;
      ocupadaAte[coluna] = etapa.sai;
      colunas[indice] = coluna;
    });
  return { colunas, total: ocupadaAte.length };
}

export default function Trajetoria() {
  const { t } = useI18n();
  const paradas = t('about.trajectory');
  const perfilRef = useRef(null);
  const linhaRef = useRef(null);
  const leituraRef = useRef(null);
  const reguaRef = useRef(null);
  const [tocando, setTocando] = useState(false);

  /* O eixo termina em hoje, e não no fim do ano corrente: assim o playhead
     chegando a 100% quer dizer "agora", e não uma data que ainda não
     aconteceu. */
  const eixo = useMemo(() => {
    const agora = anoFracionario(new Date());
    const raiz = Math.min(...PERIODOS.flat().map((tr) => anoFracionario(dataLocal(tr.inicio))));
    const posicao = (ano) => ((ano - raiz) / (agora - raiz)) * 100;
    const anos = [];
    for (let ano = Math.ceil(raiz); ano < agora; ano++) anos.push({ ano, x: posicao(ano) });
    return { raiz, agora, vao: agora - raiz, posicao, anos };
  }, []);

  /* `t()` devolve sempre o mesmo array por idioma (não é cópia), então este
     memo só recalcula quando o idioma muda de verdade — e o efeito abaixo pode
     depender dele sem rodar de novo a cada render. */
  const { pistas, colunas } = useMemo(() => {
    const base = paradas.map((parada, indice) => {
      const [periodo, titulo, instituicao, descricao] = parada;
      /* Uma etapa pode ter mais de um trecho — a monitoria foram dois semestres
         com catorze meses de intervalo. Cada trecho vira uma barra própria na
         mesma pista, e a caixa dela sai e volta junto. */
      const trechos = (PERIODOS[indice] ?? [{ inicio: null, fim: null }]).map((trecho) => {
        const x = eixo.posicao(trecho.inicio ? anoFracionario(dataLocal(trecho.inicio)) : eixo.raiz);
        const fimX = eixo.posicao(trecho.fim ? anoFracionario(dataLocal(trecho.fim)) : eixo.agora);
        return {
          x,
          largura: fimX - x,
          emCurso: trecho.fim === null,
          /* Instantes em que o playhead cruza o começo e o fim deste trecho.
             Dar estes valores à barra é o que faz ela crescer exatamente sob
             ele, no mesmo passo, em vez de animar por conta própria. */
          entra: (x / 100) * DURACAO,
          sai: (fimX / 100) * DURACAO,
        };
      });
      return {
        periodo,
        titulo,
        instituicao,
        descricao,
        trechos,
        entra: Math.min(...trechos.map((trecho) => trecho.entra)),
        sai: Math.max(...trechos.map((trecho) => trecho.sai)),
        emCurso: trechos[trechos.length - 1].emCurso,
      };
    });
    const distribuicao = distribuirColunas(base);
    const ultima = base.reduce((maior, etapa, i) => (etapa.entra > base[maior].entra ? i : maior), 0);
    return {
      colunas: distribuicao.total,
      pistas: base.map((pista, indice) => ({
        ...pista,
        coluna: distribuicao.colunas[indice],
        atual: indice === ultima,
      })),
    };
  }, [paradas, eixo]);

  /* useLayoutEffect e não useEffect: é aqui que o palco passa a empilhar as
     caixas e que o texto é fatiado. Num useEffect isso só aconteceria depois da
     primeira pintura, e as sete caixas apareceriam de uma vez por um quadro. */
  useLayoutEffect(() => {
    const perfil = perfilRef.current;
    if (!perfil) return undefined;
    /* Quem pediu menos movimento fica com a página pronta e legível: as caixas
       seguem empilhadas em fluxo normal, uma debaixo da outra, com o texto
       inteiro e as barras cheias. O painel de controle some junto (o CSS o
       esconde) — não há animação nenhuma montada para ele comandar. */
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const palco = perfil.querySelector('.perfil-palco');
    const caixas = [...perfil.querySelectorAll('.palco-cartao')];
    const barras = [...perfil.querySelectorAll('.pista-barra')];
    const nomes = [...perfil.querySelectorAll('.pista-nome')];
    const anos = [...perfil.querySelectorAll('.perfil-ano')];
    const playhead = perfil.querySelector('.perfil-playhead');
    const regua = reguaRef.current;
    const cursor = perfil.querySelector('.regua-cursor');
    const leitura = leituraRef.current;

    palco.classList.add('empilhado');

    /* Cada título vira uma fila de letras e cada descrição uma fila de palavras.
       `accessible` (ligado por padrão) deixa uma cópia do texto original num
       span visualmente escondido e marca os pedaços com `aria-hidden`, então o
       leitor de tela segue lendo a frase inteira, e não letra por letra.

       Palavras e letras, nunca linhas: o divisor refaz o corte a cada mudança de
       largura para recalcular linhas, o que trocaria justamente os elementos que
       a timeline está animando. Como aqui os pedaços são `inline-block` e se
       reposicionam sozinhos quando o texto redobra, o corte pode ser congelado —
       daí desligar o observador logo depois de cortar. */
    const divisores = caixas.flatMap((caixa) => [
      /* Classe explícita, e não o gabarito padrão: é por ela que o CSS alcança
         os pedaços, e o nome que o anime.js usaria sozinho é detalhe interno
         dele. O título é cortado também em palavras para o texto continuar
         redobrando entre palavras, e não no meio de uma. */
      text.split(caixa.querySelector('h3'), {
        words: { class: 'pedaco-palavra' },
        chars: { class: 'pedaco-letra' },
      }),
      text.split(caixa.querySelector('.palco-descricao'), {
        words: { class: 'pedaco-palavra' },
      }),
    ]);
    divisores.forEach((divisor) => divisor.resizeObserver.disconnect());
    const letras = divisores.filter((_, i) => i % 2 === 0).map((divisor) => divisor.chars);
    const palavras = divisores.filter((_, i) => i % 2 === 1).map((divisor) => divisor.words);

    utils.set(barras, { scaleX: 0 });
    utils.set(nomes, { opacity: 0 });
    utils.set(anos, { opacity: 0 });
    utils.set(playhead, { opacity: 1 });

    const curso = () => Math.max(regua.clientWidth - cursor.offsetWidth, 1);

    let arrastavel = null;
    let arrastando = false;

    function espelhar(progresso) {
      utils.set(playhead, { x: `${progresso * 100}%` });
      const ano = Math.floor(eixo.raiz + progresso * eixo.vao);
      if (leitura) leitura.textContent = String(ano);
      regua.setAttribute('aria-valuenow', String(Math.round(progresso * PASSOS_ARIA)));
      regua.setAttribute('aria-valuetext', String(ano));
    }

    function irPara(progresso) {
      linha.seek(linha.duration * Math.min(Math.max(progresso, 0), 1));
    }

    const linha = createTimeline({
      defaults: { ease: 'linear' },
      autoplay: false,
      onUpdate: (self) => {
        if (!arrastando && arrastavel) arrastavel.setX(self.progress * curso(), true);
        espelhar(self.progress);
      },
      onComplete: () => setTocando(false),
    });

    eixo.anos.forEach((marcaAno, indice) => {
      const alvo = anos[indice];
      if (!alvo) return;
      linha.add(alvo, { opacity: [0, 1], duration: DURACAO * 0.05 }, (marcaAno.x / 100) * DURACAO);
    });

    /* O texto se monta pedaço a pedaço. O passo sai do total, e não fixo: um
       título de dez letras e uma descrição de quarenta palavras têm de caber na
       mesma janela, então quem varia é o intervalo entre os pedaços. */
    function escalonar(alvos, inicio, duracao, deslocamento) {
      if (!alvos || !alvos.length) return;
      const passo = (duracao * 0.55) / Math.max(alvos.length - 1, 1);
      linha.add(alvos, {
        opacity: [0, 1],
        /* Mesma unidade dos dois lados: a doc do anime.js avisa que conversão de
           unidade no `animate()` de JS pode dar resultado inesperado, e
           `'0.4em'` para `'0em'` não converte nada. */
        y: [deslocamento, '0em'],
        duration: duracao * 0.45,
        delay: stagger(passo),
        ease: 'outQuad',
      }, inicio);
    }

    /* Cada trecho acende a caixa da etapa: a moldura entra por WAAPI encaixada
       na timeline com `sync()`, e por cima dela o texto se monta. Uma etapa com
       dois trechos remonta o texto nas duas entradas. */
    const aceso = Array(SUSTENTACAO).fill(1);
    const molduras = [];

    pistas.forEach((pista, indice) => {
      pista.trechos.forEach((trecho) => {
        const janela = trecho.sai - trecho.entra;
        const moldura = waapi.animate(caixas[indice], {
          opacity: [0, ...aceso, trecho.emCurso ? 1 : 0],
          duration: janela,
          ease: 'linear',
          autoplay: false,
        });
        linha.sync(moldura, trecho.entra);
        molduras.push(moldura);

        const entrada = Math.min(ENTRADA, janela * 0.5);
        escalonar(letras[indice], trecho.entra, entrada, '0.4em');
        escalonar(palavras[indice], trecho.entra + entrada * 0.3, entrada, '0.3em');
      });
    });

    /* Centralização. A coluna de cada etapa é fixa, mas o grupo que está em
       cena não: a cada mudança desse conjunto as caixas ativas são renumeradas
       da esquerda para a direita e deslizam para ficar centradas no palco.
       Além de tirar o encosto à esquerda, isso fecha o buraco que sobrava
       quando duas etapas em cena ocupavam colunas não vizinhas.

       O conjunto é lido no MEIO de cada intervalo, e não na borda: nos
       instantes de troca uma etapa termina no mesmo milissegundo em que outra
       começa, e no meio não há essa ambiguidade. */
    const passo = passoDeColuna(colunas);
    const momentos = [...new Set([
      0,
      DURACAO,
      ...pistas.flatMap((pista) => pista.trechos.flatMap((tr) => [tr.entra, tr.sai])),
    ])].sort((a, b) => a - b);
    const desloc = pistas.map(() => 0);
    let emCenaAntes = new Set();

    for (let k = 0; k < momentos.length - 1; k++) {
      const inicio = momentos[k];
      const meio = (inicio + momentos[k + 1]) / 2;
      const emCena = pistas
        .map((pista, indice) => ({ pista, indice }))
        .filter(({ pista }) => pista.trechos.some((tr) => meio >= tr.entra && meio <= tr.sai))
        .sort((a, b) => a.pista.coluna - b.pista.coluna);

      emCena.forEach(({ pista, indice }, ordem) => {
        const alvo = (colunas - emCena.length) / 2 + ordem - pista.coluna;
        if (alvo === desloc[indice] && emCenaAntes.has(indice)) return;
        const de = `${desloc[indice] * passo}%`;
        const para = `${alvo * passo}%`;
        if (emCenaAntes.has(indice)) {
          linha.add(caixas[indice], { x: [de, para], duration: TRANSICAO, ease: 'inOutQuad' }, inicio);
        } else {
          /* Entrando em cena: salta para o lugar um instante antes de aparecer,
             senão deslizaria da posição em que parou da última vez. */
          linha.add(caixas[indice], { x: [de, para], duration: 1 }, Math.max(inicio - 1, 0));
        }
        desloc[indice] = alvo;
      });

      emCenaAntes = new Set(emCena.map(({ indice }) => indice));
    }

    /* As barras são varridas numa lista só, na mesma ordem em que o JSX as
       desenha, porque uma pista pode ter mais de uma. */
    let barra = 0;
    pistas.forEach((pista, indice) => {
      pista.trechos.forEach((trecho) => {
        linha.add(
          barras[barra],
          { scaleX: [0, 1], duration: Math.max(trecho.sai - trecho.entra, 1) },
          trecho.entra,
        );
        barra++;
      });
      /* O nome da pista acende com a primeira barra dela e recua para meio-tom
         quando a etapa acaba — as que seguem em curso ficam claras até o fim. */
      linha.add(
        nomes[indice],
        { opacity: [0, 1], duration: DURACAO * 0.04, ease: 'outQuad' },
        pista.entra,
      );
      if (!pista.emCurso) {
        linha.add(nomes[indice], { opacity: 0.42, duration: DURACAO * 0.04 }, pista.sai);
      }
    });

    arrastavel = createDraggable(cursor, {
      y: false,
      container: regua,
      cursor: false,
      onGrab: () => {
        arrastando = true;
        linha.pause();
        setTocando(false);
      },
      onDrag: (self) => irPara(self.x / curso()),
      onRelease: () => {
        arrastando = false;
      },
    });

    function parar() {
      linha.pause();
      setTocando(false);
    }

    function saltar(evento) {
      if (evento.target.closest('.regua-cursor')) return;
      parar();
      const caixa = regua.getBoundingClientRect();
      irPara((evento.clientX - caixa.left - cursor.offsetWidth / 2) / curso());
    }

    function teclado(evento) {
      const mes = 1 / (eixo.vao * 12);
      const passos = {
        ArrowRight: mes,
        ArrowUp: mes,
        ArrowLeft: -mes,
        ArrowDown: -mes,
        PageUp: mes * 12,
        PageDown: -mes * 12,
      };
      let alvo;
      if (evento.key in passos) alvo = linha.progress + passos[evento.key];
      else if (evento.key === 'Home') alvo = 0;
      else if (evento.key === 'End') alvo = 1;
      else return;
      evento.preventDefault();
      parar();
      irPara(alvo);
    }

    regua.addEventListener('pointerdown', saltar);
    regua.addEventListener('keydown', teclado);

    /* Estado de repouso: tudo desenhado e as etapas de hoje em cena. Assim quem
       só passa os olhos lê a seção sem acionar nada, e a animação fica como algo
       a pedir, não como algo que acontece por cima de quem está lendo. */
    linha.seek(linha.duration);

    const observadorCaixa = new ResizeObserver(() => {
      if (!arrastando) arrastavel.setX(linha.progress * curso(), true);
    });
    observadorCaixa.observe(regua);

    linhaRef.current = linha;

    return () => {
      linhaRef.current = null;
      observadorCaixa.disconnect();
      regua.removeEventListener('pointerdown', saltar);
      regua.removeEventListener('keydown', teclado);
      arrastavel.revert();
      molduras.forEach((moldura) => moldura.cancel());
      linha.revert();
      /* Depois da timeline: reverter o corte devolve o texto original e apaga os
         spans que ela estava animando. */
      divisores.forEach((divisor) => divisor.revert());
      palco.classList.remove('empilhado');
    };
  }, [pistas, colunas, eixo]);

  const alternar = useCallback(() => {
    const linha = linhaRef.current;
    if (!linha) return;
    if (tocando) {
      linha.pause();
      setTocando(false);
      return;
    }
    if (linha.progress >= 1) linha.seek(0);
    linha.play();
    setTocando(true);
  }, [tocando]);

  const reiniciar = useCallback(() => {
    const linha = linhaRef.current;
    if (!linha) return;
    linha.seek(0);
    linha.play();
    setTocando(true);
  }, []);

  return (
    <div className="perfil" ref={perfilRef}>
      {/* O palco carrega o texto inteiro de cada etapa e é a única cópia dele,
          então fica como lista de verdade para quem usa leitor de tela — que
          percorre todas em ordem, independentemente de quais estão em cena.
          O gráfico abaixo é redundante com isto e sai por `aria-hidden`. */}
      <ol
        className="perfil-palco"
        style={{ '--colunas': colunas, '--vao-caixas': `${VAO_CAIXAS * 100}%` }}
      >
        {pistas.map((pista) => (
          <li
            className="palco-cartao"
            key={pista.periodo + pista.titulo}
            style={{ '--coluna': pista.coluna + 1 }}
          >
            <span className="palco-periodo">{pista.periodo}</span>
            <h3>{pista.titulo}</h3>
            <p className="instituicao">{pista.instituicao}</p>
            <p className="palco-descricao">{pista.descricao}</p>
          </li>
        ))}
      </ol>

      {/* O painel divide a grade do gráfico: botões na calha, régua na coluna do
          eixo. É o que faz os traços de ano da régua caírem em cima das linhas
          de ano das pistas. */}
      <div className="perfil-controles">
        <div className="perfil-acoes">
          <button
            type="button"
            className="perfil-botao"
            onClick={alternar}
            aria-label={tocando ? t('about.pause') : t('about.play')}
          >
            {tocando ? <FaPause /> : <FaPlay />}
          </button>
          <button
            type="button"
            className="perfil-botao"
            onClick={reiniciar}
            aria-label={t('about.replay')}
          >
            <FaArrowRotateLeft />
          </button>
        </div>

        {/* Régua: um traço por mês do eixo, mais alto na virada de cada ano.
            Fora da região `aria-hidden` do gráfico de propósito — é aqui que
            mora o controle acessível, com papel de slider e teclas próprias. */}
        <div
          className="perfil-regua"
          ref={reguaRef}
          role="slider"
          tabIndex={0}
          aria-label={t('about.scrub')}
          aria-valuemin={0}
          aria-valuemax={PASSOS_ARIA}
          aria-valuenow={PASSOS_ARIA}
          style={{
            '--passo-ano': `${100 / eixo.vao}%`,
            '--passo-mes': `${100 / (eixo.vao * 12)}%`,
          }}
        >
          <i className="regua-cursor" />
        </div>
      </div>

      <div className="perfil-tempo" aria-hidden="true">
        <div className="perfil-grade">
          {eixo.anos.map(({ ano, x }) => (
            <i key={ano} className="perfil-linha" style={{ '--x': `${x}%` }} />
          ))}
          <div className="perfil-playhead" />
        </div>

        <div className="perfil-eixo">
          {/* O ano é reescrito a cada quadro direto no nó, fora do estado do
              React. Mora na calha do eixo, que estava vazia. */}
          <span className="perfil-leitura" ref={leituraRef} />
          <div className="perfil-anos">
            {eixo.anos.map(({ ano, x }) => (
              x < FOLGA_ROTULO
                ? <span key={ano} className="perfil-ano" style={{ '--x': `${x}%` }}>{ano}</span>
                : null
            ))}
            <span className="perfil-agora">{t('about.axisNow')}</span>
          </div>
        </div>

        <ol className="perfil-pistas">
          {pistas.map((pista) => (
            <li
              key={pista.periodo + pista.titulo}
              className={`pista${pista.atual ? ' atual' : ''}`}
            >
              <span className="pista-nome">{pista.titulo}</span>
              <div className="pista-trilho">
                {pista.trechos.map((trecho) => (
                  <i
                    key={trecho.x}
                    className={`pista-barra${trecho.emCurso ? ' em-curso' : ''}`}
                    style={{ '--x': `${trecho.x}%`, '--w': `${trecho.largura}%` }}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
