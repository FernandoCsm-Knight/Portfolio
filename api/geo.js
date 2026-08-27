/**
 * País do visitante, para escolher a tabela de valores em /pricing.
 *
 * A Vercel resolve a geolocalização na borda e injeta `x-vercel-ip-country` em
 * toda requisição — nenhum serviço de terceiros, nenhuma chave de API, e o IP
 * não chega até aqui nem é gravado em lugar nenhum. Fora da Vercel (dev local,
 * outro host) o cabeçalho não existe e a resposta vem com `country: null`; o
 * cliente então cai no palpite do navegador.
 */
export default function handler(request, response) {
  const country = request.headers['x-vercel-ip-country'];

  /* `no-store` é obrigatório: sem isso a CDN guardaria a resposta do primeiro
     visitante e serviria o país dele para todo mundo depois. */
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    country: /^[A-Za-z]{2}$/.test(country || '') ? country.toUpperCase() : null,
  });
}
