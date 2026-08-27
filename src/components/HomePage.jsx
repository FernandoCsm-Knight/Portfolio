import DiveHud from './DiveHud';
import Footer from './Footer';
import OceanCanvas from './OceanCanvas';
import About from './sections/About';
import Comments from './sections/Comments';
import Hero from './sections/Hero';
import { useOceanScene } from '../hooks/useOceanScene';

/* A home é um componente próprio (e não um ramo condicional dentro de App)
   porque a cena WebGL vive num useEffect: montar/desmontar este componente é o
   que dispara a criação e o dispose do renderer. Com a navegação para
   /projetos passando a ser client-side, deixar o hook em App faria a cena
   sobreviver à saída da rota — presa a um <canvas> já removido do DOM. */
export default function HomePage({ onReady }) {
  const { canvasRef, fundoRef, hud, cenaIndisponivel } = useOceanScene(onReady);

  return (
    <>
      {!cenaIndisponivel && <OceanCanvas canvasRef={canvasRef} fundoRef={fundoRef} />}

      {!cenaIndisponivel && <DiveHud depthMeters={hud.depthMeters} />}

      <main className="ocean-scroll-track">
        <Hero />
        <About />
        <Comments />
      </main>

      <Footer />
    </>
  );
}
