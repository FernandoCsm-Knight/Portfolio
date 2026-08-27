import { CREDENCIAIS, TRAJETORIA } from '../../data/sobre';
import { SKILLS } from '../../data/skills';
import { CV_LINKS, SOCIAL_LINKS } from '../../data/socialLinks';
import { useAboutScene } from '../../hooks/useAboutScene';
import CarrosselPublicacoes from './CarrosselPublicacoes';

export default function AboutPage({ onReady }) {
  const { canvasRef, cenaIndisponivel } = useAboutScene(onReady);

  return (
    <>
      <div id="fundo" className="fundo-caderno" />
      {!cenaIndisponivel && <canvas id="mar" ref={canvasRef} />}
      <div id="vinheta" />
      <div className="sobre-overlay" aria-hidden="true" />

      <main className="caderno">
        <header className="ficha">
          <div className="rotulo">CADERNO DE BORDO · FICHA DO MERGULHADOR</div>
          <h1>
            Fernando
            <br />
            <em>Dal&apos; Maria</em>
          </h1>
          <p className="sub">
            Ciência da Computação na PUC Minas · Belo Horizonte, MG · português nativo, inglês fluente.
            Computação gráfica, inteligência artificial e alto desempenho.
          </p>
          <div className="elos-linha">
            {CV_LINKS.map((cv) => (
              <a key={cv.label} href={cv.href} title={cv.title} target="_blank" rel="noreferrer">
                BAIXAR CV · {cv.label}
              </a>
            ))}
          </div>
        </header>

        <section className="bloco" aria-labelledby="titulo-trajetoria">
          <div className="rotulo">PERFIL DE MERGULHO</div>
          <h2 id="titulo-trajetoria">Trajetória</h2>
          <ol className="trajetoria">
            {TRAJETORIA.map((parada) => (
              <li key={parada.periodo + parada.titulo} className={parada.atual ? 'atual' : undefined}>
                <div className="parada-marca">
                  <span className="marca">{parada.marca}</span>
                  <span className="periodo">{parada.periodo}</span>
                </div>
                <h3>{parada.titulo}</h3>
                <p className="instituicao">{parada.instituicao}</p>
                <p>{parada.descricao}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bloco" aria-labelledby="titulo-publicacoes">
          <div className="rotulo">REGISTROS PUBLICADOS</div>
          <h2 id="titulo-publicacoes">Artigos</h2>
          <CarrosselPublicacoes />
        </section>

        <section className="bloco" aria-labelledby="titulo-credenciais">
          <div className="rotulo">INSÍGNIAS</div>
          <h2 id="titulo-credenciais">Certificações e prêmios</h2>
          <ul className="credenciais">
            {CREDENCIAIS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="trilha-tecnica">{SKILLS.join(' · ')}</p>
        </section>

        <section className="bloco" aria-labelledby="titulo-transmissao">
          <div className="rotulo">TRANSMISSÃO</div>
          <h2 id="titulo-transmissao">Canal aberto.</h2>
          <div className="elos-linha">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
