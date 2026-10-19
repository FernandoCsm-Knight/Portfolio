import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';
import handler from '../api/pexels.js';

function request(url, method = 'GET') {
  const response = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(body) { this.body = JSON.parse(body); },
  };
  return handler({ url, method }, response).then(() => response);
}

test('Pexels proxy validates requests and returns only safe photo fields', async () => {
  const previousKey = process.env.PEXELS_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.PEXELS_API_KEY = 'test-key';
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, 'test-key');
      assert.equal(url.searchParams.get('query'), 'ocean');
      assert.equal(url.searchParams.get('locale'), 'pt-BR');
      return {
        ok: true,
        json: async () => ({ photos: [
          { id: 1, url: 'https://www.pexels.com/photo/sea-1/', alt: 'Sea', photographer: 'A', photographer_url: 'https://www.pexels.com/@a', src: { large: 'https://images.pexels.com/photos/1/large.jpeg' }, ignored: 'private' },
          { id: 2, url: 'https://example.com/photo', src: { large: 'https://example.com/photo.jpeg' } },
        ] }),
      };
    };
    const success = await request('/api/pexels?query=ocean&locale=pt-BR');
    assert.equal(success.statusCode, 200);
    assert.equal(success.body.photos.length, 1);
    assert.equal(success.body.photos[0].src, 'https://images.pexels.com/photos/1/large.jpeg');
    assert.equal(success.body.photos[0].ignored, undefined);
    assert.equal((await request('/api/pexels?query=x')).statusCode, 400);
    assert.equal((await request('/api/pexels?query=ocean', 'POST')).statusCode, 405);
    globalThis.fetch = async () => ({ ok: false, status: 429 });
    assert.deepEqual((await request('/api/pexels?query=ocean')).body, { error: 'rate_limit' });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.PEXELS_API_KEY;
    else process.env.PEXELS_API_KEY = previousKey;
  }
});
