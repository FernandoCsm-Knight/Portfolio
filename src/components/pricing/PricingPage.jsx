import { useEffect, useMemo, useState } from 'react';
import { FaPaperPlane, FaRegClock } from 'react-icons/fa';
import { detectCountry } from '../../services/geo';
import {
  formatAmount,
  listRatesForCountry,
  localizeRate,
  pricingConfigured,
  selectMarketRates,
} from '../../services/pricing';
import { useI18n } from '../../i18n/context';

function nomeDoPais(codigo, localeTag) {
  try {
    return new Intl.DisplayNames([localeTag], { type: 'region' }).of(codigo) || codigo;
  } catch {
    /* Navegador sem Intl.DisplayNames: o código de duas letras já identifica o
       mercado, e a linha continua fazendo sentido. */
    return codigo;
  }
}

export default function PricingPage({ onReady }) {
  const { t, locale, localeTag } = useI18n();
  const [linhas, setLinhas] = useState([]);
  const [pais, setPais] = useState(null);
  const [carregando, setCarregando] = useState(pricingConfigured);
  const [erro, setErro] = useState(false);

  /* A tela de carregamento sai no primeiro quadro, como nas outras rotas: quem
     espera a tabela é a própria página, com um estado de carregamento interno.
     Prender o loader ao Supabase deixaria a rota refém de uma consulta lenta. */
  useEffect(() => {
    const frame = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(frame);
  }, [onReady]);

  /* Busca só uma vez: a tradução acontece na renderização, então trocar de
     idioma não precisa reconsultar o banco. */
  useEffect(() => {
    if (!pricingConfigured) return undefined;

    const controller = new AbortController();
    let ativo = true;

    (async () => {
      try {
        const country = await detectCountry({ signal: controller.signal });
        const rows = await listRatesForCountry(country, { signal: controller.signal });
        if (!ativo) return;
        setPais(country);
        setLinhas(selectMarketRates(rows, country));
      } catch (erroConsulta) {
        if (!ativo || erroConsulta?.name === 'AbortError') return;
        setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => { ativo = false; controller.abort(); };
  }, []);

  const tarifas = useMemo(
    () => linhas.map((row) => localizeRate(row, locale)),
    [linhas, locale],
  );

  /* Se a linha exibida nomeia o país do visitante, a tabela é do mercado dele;
     caso contrário caiu no curinga e o rótulo precisa dizer isso. */
  const mercadoLocal = Boolean(pais) && linhas.some((row) => row.markets?.includes(pais));
  const rotuloMercado = mercadoLocal
    ? t('pricing.marketLocal', { country: nomeDoPais(pais, localeTag) })
    : t('pricing.marketDefault');

  return (
    <>
      <div id="fundo" className="fundo-caderno" />
      <div id="vinheta" />
      <div className="sobre-overlay contato-overlay" aria-hidden="true" />

      <main className="precos-page">
        <header className="precos-cabecalho">
          <h1>{t('pricing.title')}</h1>
          <p className="precos-intro">{t('pricing.intro')}</p>
          {tarifas.length > 0 && (
            <p className="precos-mercado">
              <FaRegClock aria-hidden="true" />
              {rotuloMercado}
            </p>
          )}
        </header>

        {!pricingConfigured && (
          <p className="precos-aviso" role="status">{t('pricing.unavailable')}</p>
        )}
        {pricingConfigured && carregando && (
          <p className="precos-aviso" role="status">{t('pricing.loading')}</p>
        )}
        {pricingConfigured && !carregando && erro && (
          <p className="precos-aviso" role="status">{t('pricing.failed')}</p>
        )}
        {pricingConfigured && !carregando && !erro && tarifas.length === 0 && (
          <p className="precos-aviso" role="status">{t('pricing.empty')}</p>
        )}

        {tarifas.length > 0 && (
          <ul className="precos-lista">
            {tarifas.map((tarifa) => (
              <li
                key={tarifa.id}
                className={`preco-card glass-card${tarifa.featured ? ' destaque' : ''}`}
              >
                <h2>{tarifa.title}</h2>
                <p className="preco-valor">
                  <strong>{formatAmount(tarifa.amount, tarifa.currency, localeTag)}</strong>
                  <span>{t('pricing.perHour')}</span>
                </p>
                <p className="preco-descricao">{tarifa.description}</p>
              </li>
            ))}
          </ul>
        )}

        <footer className="precos-rodape">
          <p className="precos-nota">{t('pricing.note')}</p>
          <a className="contato-chamada" href="/contact">
            <FaPaperPlane aria-hidden="true" />
            <span>{t('contact.action')}</span>
          </a>
        </footer>
      </main>
    </>
  );
}
