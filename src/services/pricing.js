import { requireSupabase, supabaseConfigured, unwrap } from './supabase';

export const pricingConfigured = supabaseConfigured;

/* Mercado curinga: a tarifa de quem não se encaixa em nenhum país cadastrado. */
export const MERCADO_PADRAO = '*';

/* Reaproveitada por pricingAdmin.js (com ,updated_at anexado) — evita que as
   duas listas de colunas divirjam quando um campo for adicionado. */
export const COLUMNS = 'id,position,markets,currency,amount,title_pt,title_en,title_es,description_pt,description_en,description_es,featured,active';

/* `locale` já vem validado pelo I18nProvider (pt/en/es); o fallback para
   português cobre uma linha cadastrada antes de um novo idioma existir. */
export function localizeRate(row, locale) {
  return {
    id: row.id,
    title: row[`title_${locale}`] || row.title_pt,
    description: row[`description_${locale}`] || row.description_pt,
    currency: row.currency,
    amount: Number(row.amount),
    featured: row.featured,
  };
}

/**
 * Formata o valor na moeda da linha — não na do visitante. Quem cobra em reais
 * cobra em reais; converter na tela criaria um número que não corresponde ao
 * que vai na nota. O `locale` só decide a pontuação e a posição do símbolo.
 */
export function formatAmount(amount, currency, localeTag) {
  const valor = Number(amount);
  try {
    return new Intl.NumberFormat(localeTag, {
      style: 'currency',
      currency,
      /* Centavos só quando existem: "R$ 150" lê melhor que "R$ 150,00" numa
         tabela de valores, mas "R$ 149,90" não pode virar "R$ 150". */
      minimumFractionDigits: Number.isInteger(valor) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(valor);
  } catch {
    /* Moeda que o navegador não conheça: melhor "BRL 150" do que quebrar a
       página inteira por causa de um código digitado errado no painel. */
    return `${currency} ${valor}`;
  }
}

/**
 * Linhas ativas que valem para `country`, já filtradas no servidor: o visitante
 * recebe a tarifa do mercado dele e a padrão, e não a tabela dos outros países.
 *
 * `country` nulo (borda e navegador sem resposta) traz só a padrão.
 */
export async function listRatesForCountry(country, { signal } = {}) {
  const mercados = country ? [country, MERCADO_PADRAO] : [MERCADO_PADRAO];
  let query = requireSupabase()
    .from('hourly_rates')
    .select(COLUMNS)
    .eq('active', true)
    .overlaps('markets', mercados)
    .order('position', { ascending: true });

  if (signal) query = query.abortSignal(signal);

  return unwrap(query);
}

/**
 * Entre o que voltou da consulta, fica só um mercado: se existe tarifa cadastrada
 * para o país do visitante, a padrão não aparece junto — senão a página mostraria
 * duas linhas "Consultoria técnica" com preços diferentes.
 */
export function selectMarketRates(rows, country) {
  const doPais = country ? rows.filter((row) => row.markets?.includes(country)) : [];
  if (doPais.length > 0) return doPais;
  return rows.filter((row) => row.markets?.includes(MERCADO_PADRAO));
}
