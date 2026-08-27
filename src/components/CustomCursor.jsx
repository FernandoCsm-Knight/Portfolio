import { memo } from 'react';
import { useCustomCursor } from '../hooks/useCustomCursor';

function CustomCursor({ clickEffectsEnabled = true }) {
  const { ringRef, labelRef } = useCustomCursor({ clickEffectsEnabled });
  return (
    <>
      <div id="c-sub" ref={ringRef} aria-hidden="true">
        <svg viewBox="0 0 86 48">
          <path className="sub-cauda" d="M20 20 7 11v12l-5 1 5 2v12l13-9Z" />
          <g className="sub-helice">
            <path d="M7 16v16M3 19l8 10M3 29l8-10" />
          </g>
          <path className="sub-casco" d="M17 15h43c11 0 19 5 23 9-4 5-12 10-23 10H17c-5 0-9-4-9-10s4-9 9-9Z" />
          <path className="sub-sombra" d="M13 29c13 4 46 5 65-2-5 5-11 7-19 7H17c-3 0-6-2-8-4Z" />
          <path className="sub-torre" d="M35 15c1-6 5-9 12-9 6 0 10 3 11 9Z" />
          <path className="sub-periscopio" d="M45 7V2h8" />
          <path className="sub-leme" d="m27 15 8-8 9 8m-17 19 8 8 9-8" />
          <circle className="sub-janela" cx="51" cy="24" r="4.2" />
          <circle className="sub-janela" cx="65" cy="24" r="3.5" />
          <path className="sub-feixe" d="m80 20 20-8v24l-20-8Z" />
          <circle className="sub-luz" cx="80" cy="24" r="2.6" />
          <circle className="sub-bolha sub-bolha-um" cx="1" cy="22.5" r="1.4" />
          <circle className="sub-bolha sub-bolha-dois" cx="-5" cy="25" r="1" />
          <circle className="sub-bolha sub-bolha-tres" cx="-9" cy="21.5" r="1.7" />
          <circle className="sub-bolha sub-bolha-quatro" cx="-14" cy="24" r="1.15" />
        </svg>
      </div>
      {/* preenchido imperativamente pelo hook a partir do evento disparado
          pelo mapa de expedições — a home não tem mais criaturas clicáveis. */}
      <div id="c-alvo" ref={labelRef} aria-hidden="true">
        <span className="alvo-rotulo" />
        <span className="alvo-titulo" />
      </div>
    </>
  );
}

export default memo(CustomCursor);
