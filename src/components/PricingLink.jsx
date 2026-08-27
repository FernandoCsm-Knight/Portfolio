import { FaDollarSign } from 'react-icons/fa6';
import { useI18n } from '../i18n/context';

/**
 * Atalho quadrado para /pricing, sempre emparelhado com o selo de status dentro
 * de um `.status-linha`.
 *
 * O ícone vem do `fa6` — e não do `fa` — porque as duas versões desenham o
 * cifrão diferente, e o botão aparece no Hero e em /contact: vindo de conjuntos
 * distintos, os dois não seriam o mesmo botão.
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
