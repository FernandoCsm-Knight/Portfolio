import { memo } from 'react';
import { SKILLS } from '../../data/skills';

function About() {
  return (
    <section id="sobre">
      <div className="rotulo">COMPARTIMENTO · ~380M — ZONA CREPUSCULAR</div>
      <h2>Ciência da Computação na PUC Minas.</h2>
      <p className="sub">
        Frameworks de aprendizado profundo em C++ com CUDA, ferramentas visuais de grafos e autômatos,
        pesquisa em interpretabilidade de modelos. Bolsista CNPq, publicação no IHC 2024 com Menção Honrosa.
      </p>
      <p className="trilha-tecnica">{SKILLS.join(' · ')}</p>
      <a className="abrir-mapa" href={`${import.meta.env.BASE_URL}sobre`}>
        ABRIR CADERNO DE BORDO
      </a>
    </section>
  );
}

export default memo(About);
