import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/context';

/* O fuso é o de quem responde, não o de quem visita. Um relógio que seguisse o
   navegador do visitante não informaria nada — ele já sabe que horas são. */
const FUSO = 'America/Sao_Paulo';

function lerHora(localeTag) {
  try {
    /* `h23` em vez do padrão do locale: em inglês sairia "2:32 PM", e o
       mostrador de 24h combina com o resto do chrome, que é todo mono. */
    return new Intl.DateTimeFormat(localeTag, {
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: FUSO,
    }).format(new Date());
  } catch {
    /* Fuso ou locale que o navegador não conheça: o selo continua de pé, só
       sem a linha do relógio. */
    return null;
  }
}

/**
 * Selo de status: um farol pulsando, o rótulo "Online" e a hora corrente em
 * Belo Horizonte.
 *
 * O rótulo é fixo por decisão do autor do site. O relógio é que é ao vivo, e é
 * dele que vem a sensação de presença.
 *
 * Componente próprio (e não um trecho do Hero) porque o mostrador muda de
 * minuto em minuto: isolado, esse re-render não alcança o Hero memoizado.
 */
export default function AvailabilityStatus() {
  const { t, localeTag } = useI18n();
  const [hora, setHora] = useState(() => lerHora(localeTag));

  useEffect(() => {
    let timeoutId;
    const atualizar = () => setHora(lerHora(localeTag));

    /* Acorda na virada do minuto, e não a cada 60s corridos: é só aí que o
       mostrador muda, e um intervalo fixo acumularia deriva até exibir um
       minuto atrasado. */
    function agendarViradaDoMinuto() {
      timeoutId = setTimeout(() => {
        atualizar();
        agendarViradaDoMinuto();
      }, 60000 - (Date.now() % 60000) + 40);
    }

    /* Navegadores estrangulam temporizadores em aba oculta. Sem isto, quem
       volta para a aba encontra o relógio parado na hora em que saiu. */
    function aoTrocarVisibilidade() {
      if (document.hidden) return;
      clearTimeout(timeoutId);
      atualizar();
      agendarViradaDoMinuto();
    }

    atualizar();
    agendarViradaDoMinuto();
    document.addEventListener('visibilitychange', aoTrocarVisibilidade);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade);
    };
  }, [localeTag]);

  return (
    <div className="selo-disponibilidade">
      <p className="disponibilidade-status">
        <i className="disponibilidade-farol" aria-hidden="true" />
        {t('availability.status')}
      </p>
      {/* Sem `aria-live`: o relógio não é uma novidade a ser anunciada a cada
          minuto para quem usa leitor de tela. */}
      {hora && (
        <p className="disponibilidade-detalhe">{t('availability.clock', { time: hora })}</p>
      )}
    </div>
  );
}
