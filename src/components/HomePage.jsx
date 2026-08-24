import DiveHud from './DiveHud';
import Footer from './Footer';
import OceanCanvas from './OceanCanvas';
import SonarNav from './SonarNav';
import About from './sections/About';
import Contact from './sections/Contact';
import Hero from './sections/Hero';
import Projects from './sections/Projects';
import { useIntroScroll } from '../hooks/useIntroScroll';
import { useOceanScene } from '../hooks/useOceanScene';

/* A home é um componente próprio (e não um ramo condicional dentro de App)
   porque a cena WebGL vive num useEffect: montar/desmontar este componente é o
   que dispara a criação e o dispose do renderer. Com a navegação para
   /projetos passando a ser client-side, deixar o hook em App faria a cena
   sobreviver à saída da rota — presa a um <canvas> já removido do DOM. */
/* puramente decorativo: fora da árvore de acessibilidade, e sem id para não
   entrar na conta do IntersectionObserver da navegação. */
function Divisor() {
  return (
    <div className="divisor" aria-hidden="true">
      <i />
    </div>
  );
}

export default function HomePage({ onReady }) {
  const { canvasRef, fundoRef, hud, cenaIndisponivel } = useOceanScene(onReady);
  /* o nome fica no meio de uma seção de ~190vh; sem esta descida o
     carregamento abre em água vazia, com o título ainda fora da tela. */
  useIntroScroll('#inicio h1');

  return (
    <>
      {!cenaIndisponivel && <OceanCanvas canvasRef={canvasRef} fundoRef={fundoRef} />}

      {!cenaIndisponivel && <DiveHud depthMeters={hud.depthMeters} />}
      <SonarNav />

      <main className="ocean-scroll-track">
        <Hero />
        <Divisor />
        <About />
        <Divisor />
        <Projects />
        <Divisor />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
