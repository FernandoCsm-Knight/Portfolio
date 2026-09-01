import { useEffect, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { useI18n } from '../../i18n/context';

const LIMIAR_ROLAGEM = 24;

/* Dica temporária de "role para explorar": quem abre o site pela primeira vez
   não sabe que o hero é só a superfície — a cena de oceano atrás não deixa
   isso óbvio sozinha. Some assim que a rolagem começa, então não é decoração
   permanente, é só o empurrão inicial. `aria-hidden` pelo mesmo motivo do
   HUD de profundidade: é reforço visual do que a página já expõe por outros
   meios (títulos de seção, ordem do documento), não informação nova. */
export default function ScrollHint() {
  const { t } = useI18n();
  const [visivel, setVisivel] = useState(() => window.scrollY < LIMIAR_ROLAGEM);

  useEffect(() => {
    if (!visivel) return undefined;
    function aoRolar() {
      if (window.scrollY >= LIMIAR_ROLAGEM) setVisivel(false);
    }
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, [visivel]);

  if (!visivel) return null;

  return (
    <div className="dica-rolagem" aria-hidden="true">
      <span>{t('hero.scrollHint')}</span>
      <FaChevronDown />
    </div>
  );
}
