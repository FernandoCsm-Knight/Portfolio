import { useI18n } from '../i18n/context';

/**
 * Selo "Online": só o farol pulsando, redondo como o seletor de idiomas —
 * e também um link, para /contact: quem vê que está "Online" tem ali mesmo o
 * caminho para falar com o autor do site.
 *
 * Já foi um selo maior, com rótulo por extenso e um relógio ao vivo na hora
 * de Belo Horizonte. Virou este ícone quando o par (preços + status) saiu do
 * Hero e passou a acompanhar o seletor de idiomas em toda página — nesse
 * tamanho não há onde por relógio, e a leitura "Online" continua acessível
 * via `aria-label`/`title`.
 */
export default function AvailabilityStatus() {
  const { t } = useI18n();
  const rotulo = `${t('availability.status')} · ${t('nav.contact')}`;
  return (
    <a className="selo-disponibilidade-compacto" href="/contact" aria-label={rotulo} title={rotulo}>
      <i className="disponibilidade-farol" aria-hidden="true" />
    </a>
  );
}
