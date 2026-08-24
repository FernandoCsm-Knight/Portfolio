import { memo } from 'react';
import { GiSubmarine } from 'react-icons/gi';

/* Continua sendo uma âncora, não um <button>: o destino é uma URL, então
   clique do meio, "abrir em nova aba" e o preview do link no navegador
   seguem funcionando de graça. O visual é que é de botão. */
function VoltarAoMergulho({ ancora = '' }) {
  return (
    <a
      className="voltar-mergulho"
      href={`${import.meta.env.BASE_URL}${ancora}`}
      aria-label="Voltar ao mergulho"
    >
      {/* mesmo truque do escafandro: traço de comprimento zero com ponta
          redonda vira um ponto, e o dasharray distribui os rebites pela
          circunferência inteira */}
      <svg className="anel-rebites" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="45" />
      </svg>
      <GiSubmarine aria-hidden="true" />
      <span aria-hidden="true">VOLTAR AO MERGULHO</span>
    </a>
  );
}

export default memo(VoltarAoMergulho);
