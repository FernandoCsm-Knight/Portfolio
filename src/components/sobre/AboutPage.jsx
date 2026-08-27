import { CV_LINKS } from '../../data/socialLinks';
import { useAboutScene } from '../../hooks/useAboutScene';
import { useI18n } from '../../i18n/context';
import CarrosselPublicacoes from './CarrosselPublicacoes';

export default function AboutPage({ onReady }) {
  const { t } = useI18n();
  const { canvasRef, cenaIndisponivel } = useAboutScene(onReady);
  const trajectory = t('about.trajectory');
  const credentials = t('about.credentials');

  return (
    <>
      <div id="fundo" className="fundo-caderno" />
      {!cenaIndisponivel && <canvas id="mar" ref={canvasRef} />}
      <div id="vinheta" />
      <div className="sobre-overlay" aria-hidden="true" />

      <main className="caderno">
        <header className="ficha">
          <div className="ficha-conteudo">
            <div className="rotulo">{t('about.dossier')}</div>
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
                <a key={cv.label} href={cv.href} title={cv.title} target="_blank" rel="noreferrer">
                  {t('about.downloadCv')} · {cv.label}
                </a>
              ))}
            </div>
          </div>

          <figure className="ficha-foto">
            <img
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
          <div className="rotulo">{t('about.trajectoryKicker')}</div>
          <h2 id="titulo-trajetoria">{t('about.trajectoryTitle')}</h2>
          <p className="bloco-intro">
            {t('about.trajectoryIntro')}
          </p>
          <ol className="trajetoria">
            {trajectory.map(([marca, periodo, titulo, instituicao, descricao], index) => (
              <li key={periodo + titulo} className={index === trajectory.length - 1 ? 'atual' : undefined}>
                <div className="parada-marca">
                  <span className="marca">{marca}</span>
                  <span className="periodo">{periodo}</span>
                </div>
                <h3>{titulo}</h3>
                <p className="instituicao">{instituicao}</p>
                <p>{descricao}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bloco" aria-labelledby="titulo-publicacoes">
          <div className="rotulo">{t('about.papersKicker')}</div>
          <h2 id="titulo-publicacoes">{t('about.papersTitle')}</h2>
          <p className="bloco-intro">
            {t('about.papersIntro')}
          </p>
          <CarrosselPublicacoes />
        </section>

        <section className="bloco" aria-labelledby="titulo-credenciais">
          <div className="rotulo">{t('about.credentialsKicker')}</div>
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
