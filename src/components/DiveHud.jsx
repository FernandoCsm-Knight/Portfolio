import { memo } from 'react';
import { PROFUNDIDADE_MAX_M } from '../services/ocean/constants';

/* Instrumento puramente decorativo: repete em texto o que a cena já comunica
   visualmente. Fica fora da árvore de acessibilidade — do contrário um leitor
   de tela anuncia "132m", "133m", "134m"... a cada frame de rolagem. */
function DiveHud({ depthMeters }) {
  const pontoTop = Math.min(100, Math.max(0, (depthMeters / PROFUNDIDADE_MAX_M) * 100));

  return (
    <div id="hud" aria-hidden="true">
      <span className="prof">{depthMeters}m</span>
      <div className="trilho">
        <i style={{ top: `${pontoTop}%` }} />
      </div>
    </div>
  );
}

export default memo(DiveHud);
