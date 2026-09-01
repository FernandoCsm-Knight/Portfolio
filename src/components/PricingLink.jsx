import { FaDollarSign } from 'react-icons/fa6';
import { useI18n } from '../i18n/context';

/**
 * Atalho redondo para /pricing, sempre emparelhado com o selo "online" em
 * `StatusBadges.jsx` — o par fixo ao lado do seletor de idiomas, em toda
 * página.
 *
 * O ícone vem do `fa6` — e não do `fa` — porque as duas versões desenham o
 * cifrão diferente, e outros ícones do mesmo par (o farol de status) também
 * vêm do `fa6`.
 */
export default function PricingLink() {
  const { t } = useI18n();
  /* Sem texto visível, o rótulo precisa existir duas vezes: `aria-label` para
     quem usa leitor de tela e `title` para quem passa o mouse e vê só um `$`. */
  const rotulo = t('pricing.action');

  return (
    <a className="botao-valores" href="/pricing" aria-label={rotulo} title={rotulo}>
      <FaDollarSign aria-hidden="true" />
    </a>
  );
}
