/* Endereços e preços. O texto fica em content.js. */

export const SITE_URL = 'https://fannar.fernandocsdm.com';
export const PORTFOLIO_URL = 'https://fernandocsdm.com';
export const CONTACT_URL = `${PORTFOLIO_URL}/contact`;
export const HOURLY_URL = `${PORTFOLIO_URL}/pricing`;
export const REPO_URL = 'https://github.com/FernandoCsm-Knight/Fannar';
/* Caminho público da página do Fannar no subdomínio (usado no build: fallback
   para crawlers e llms.txt). No navegador, ver routes.js. */
export const FANNAR_PATH = '/metodo';

/* Preço inicial de cada pacote, pelo `id` de content.js, em cada moeda. A
   página mostra "a partir de" na moeda do idioma (PRICE_CURRENCY), sem
   conversão; um pacote `null` mostra "Sob consulta".

   Estimativa (nov/2026): horas de cada escopo × o valor de "Pesquisa e
   colaboração" do portfólio (R$ 200/h; US$ 60/h), com o dólar arredondado
   para cima por ser trabalho de escopo fechado num método próprio:
     Diagnóstico   ~30 h · Auditoria ~70 h · Integração ~140 h + 30 dias de suporte. */
export const PACKAGE_PRICES = {
  diagnostico: { BRL: 6000, USD: 2500 },
  auditoria: { BRL: 14000, USD: 5500 },
  integracao: { BRL: 28000, USD: 11000 },
};

/* O site não sabe o país do visitante: a moeda segue o idioma. */
export const PRICE_CURRENCY = { pt: 'BRL', en: 'USD', es: 'USD' };
