import { memo } from 'react';

function Hero() {
  return (
    <section id="inicio">
      <div className="rotulo">DIÁRIO DE BORDO · 0M — LINHA D&apos;ÁGUA</div>
      <h1>
        Fernando
        <br />
        <em>Dal&apos; Maria</em>
      </h1>
      <p className="sub">Computação gráfica, inteligência artificial e alto desempenho.</p>
      <div className="dica-rolar">
        <i /> ACIONAR DESCIDA
      </div>
    </section>
  );
}

export default memo(Hero);
