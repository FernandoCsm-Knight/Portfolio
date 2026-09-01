import { createDraggable } from 'animejs';
import { useEffect, useRef } from 'react';
import { CV_LINKS } from '../../data/socialLinks';
import { useAboutScene } from '../../hooks/useAboutScene';
import { useI18n } from '../../i18n/context';
import { EXTERNAL_LINK_PROPS } from '../../utils/links';
import CarrosselPublicacoes from './CarrosselPublicacoes';
import Trajetoria from './Trajetoria';

/* Abaixo disto a ficha vira uma coluna só e a foto ocupa a largura inteira.
   Arrastar ali exigiria `touch-action:none`, que sequestraria a rolagem
   vertical em cima do maior alvo de toque da página — então o arrasto é
   desligado, e não só encolhido. */
const LARGURA_ARRASTAVEL = '(min-width: 761px)';

export default function AboutPage({ onReady }) {
  const { t } = useI18n();
  const { canvasRef, cenaIndisponivel } = useAboutScene(onReady);
  const credentials = t('about.credentials');
  const fichaRef = useRef(null);
  const fotoRef = useRef(null);

  /* A foto passeia pela ficha inteira. `container` é o próprio <header>, então
     o Draggable já prende a figura dentro dele — não há conta de limites aqui.
     `cursor:false` porque o site desenha o próprio ponteiro, e deixar o
     Draggable trocar o nativo faria aparecer dois.

     useEffect e não useLayoutEffect: nada precisa estar no lugar antes da
     primeira pintura, a foto só ganha a capacidade de ser arrastada. */
  useEffect(() => {
    const ficha = fichaRef.current;
    const foto = fotoRef.current;
    if (!ficha || !foto) return undefined;

    const consulta = matchMedia(LARGURA_ARRASTAVEL);
    let arrastavel = null;

    function sincronizar() {
      if (consulta.matches && !arrastavel) {
        arrastavel = createDraggable(foto, { container: ficha, cursor: false });
        foto.classList.add('foto-arrastavel');
      } else if (!consulta.matches && arrastavel) {
        /* `revert` devolve a foto ao lugar de origem, o que é o certo aqui: a
           posição em que ela ficou numa tela larga não faz sentido depois que
           a ficha virou uma coluna. */
        arrastavel.revert();
        arrastavel = null;
        foto.classList.remove('foto-arrastavel');
      }
    }

    sincronizar();
    consulta.addEventListener('change', sincronizar);
    return () => {
      consulta.removeEventListener('change', sincronizar);
      if (arrastavel) arrastavel.revert();
      foto.classList.remove('foto-arrastavel');
    };
  }, []);

  return (
    <>
      <div id="fundo" className="fundo-caderno" />
      {!cenaIndisponivel && <canvas id="mar" ref={canvasRef} />}
      <div id="vinheta" />
      <div className="sobre-overlay" aria-hidden="true" />

      <main className="caderno">
        <header className="ficha" ref={fichaRef}>
          <div className="ficha-conteudo">
            <h1>
              Fernando
              <br />
              <em>Dal&apos; Maria</em>
            </h1>
            <p className="sub">
              {t('about.role')}
            </p>
            <p className="ficha-resumo">
              {t('about.summary')}
            </p>
            <ul className="ficha-destaques" aria-label="Destaques profissionais">
              <li><strong>9,475</strong><span>{t('about.average')}</span></li>
              <li><strong>2</strong><span>{t('about.papers')}</span></li>
              <li><strong>C++ · CUDA</strong><span>{t('about.highPerformance')}</span></li>
            </ul>
            <div className="elos-linha">
              {CV_LINKS.map((cv) => (
                <a key={cv.label} href={cv.href} title={cv.title} {...EXTERNAL_LINK_PROPS}>
                  {t('about.downloadCv')} · {cv.label}
                </a>
              ))}
            </div>
          </div>

          <figure className="ficha-foto" ref={fotoRef}>
            {/* `draggable={false}` corta o arrasto nativo de imagem do
                navegador, que senão levantaria o fantasma translúcido dela por
                cima e brigaria com o Draggable. */}
            <img
              draggable={false}
              src="/images/me.jpeg"
              alt={t('about.photoAlt')}
              width="1600"
              height="1597"
              loading="eager"
              decoding="async"
            />
            <figcaption>{t('about.location')}</figcaption>
          </figure>
        </header>

        <section className="bloco" aria-labelledby="titulo-trajetoria">
          <h2 id="titulo-trajetoria">{t('about.trajectoryTitle')}</h2>
          <Trajetoria />
        </section>

        <section className="bloco" aria-labelledby="titulo-publicacoes">
          <h2 id="titulo-publicacoes">{t('about.papersTitle')}</h2>
          <CarrosselPublicacoes />
        </section>

        <section className="bloco" aria-labelledby="titulo-credenciais">
          <h2 id="titulo-credenciais">{t('about.credentialsTitle')}</h2>
          <p className="bloco-intro">
            {t('about.credentialsIntro')}
          </p>
          <ul className="credenciais">
            {credentials.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
