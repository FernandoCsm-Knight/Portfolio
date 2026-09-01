import AvailabilityStatus from './AvailabilityStatus';
import PricingLink from './PricingLink';

/* Par de atalhos fixo, junto ao seletor de idiomas — preços e o status
   "online" (que já é o link para /contact) — em toda página pública, e não
   só no Hero: quem entra direto por /about ou /projects tem o mesmo acesso. */
export default function StatusBadges() {
  return (
    <div className="status-badges">
      <PricingLink />
      <AvailabilityStatus />
    </div>
  );
}
