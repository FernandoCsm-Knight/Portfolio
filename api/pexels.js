const LOCALES = new Set(['pt-BR', 'en-US', 'es-ES']);

function send(response, status, body, cache = 'no-store') {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', cache);
  response.end(JSON.stringify(body));
}

function safeUrl(value, host) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === host ? url.href : null;
  } catch {
    return null;
  }
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    send(response, 405, { error: 'method_not_allowed' });
    return;
  }

  const params = new URL(request.url, 'http://localhost').searchParams;
  const query = params.get('query')?.trim() || '';
  if (query.length < 2 || query.length > 80) {
    send(response, 400, { error: 'invalid_query' });
    return;
  }

  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) {
    send(response, 503, { error: 'unavailable' });
    return;
  }

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '30');
  const locale = params.get('locale');
  if (LOCALES.has(locale)) url.searchParams.set('locale', locale);

  try {
    const upstream = await fetch(url, {
      headers: { Authorization: key, Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
    });
    if (!upstream.ok) {
      send(response, upstream.status === 429 ? 429 : 502, {
        error: upstream.status === 429 ? 'rate_limit' : 'upstream_error',
      });
      return;
    }

    const data = await upstream.json();
    const photos = (Array.isArray(data.photos) ? data.photos : [])
      .map((photo) => ({
        id: photo.id,
        url: safeUrl(photo.url, 'www.pexels.com'),
        alt: typeof photo.alt === 'string' ? photo.alt : '',
        photographer: typeof photo.photographer === 'string' ? photo.photographer : '',
        photographerUrl: safeUrl(photo.photographer_url, 'www.pexels.com'),
        src: safeUrl(photo.src?.large, 'images.pexels.com'),
      }))
      .filter((photo) => photo.src && photo.url);

    send(response, 200, { photos }, 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  } catch {
    send(response, 502, { error: 'upstream_error' });
  }
}
