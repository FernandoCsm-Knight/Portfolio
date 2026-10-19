import { useEffect, useRef, useState } from 'react';
import { FiLoader, FiSearch } from 'react-icons/fi';
import { TbPhotoOff } from 'react-icons/tb';
import { useI18n } from '../../i18n/context';
import { EXTERNAL_LINK_PROPS } from '../../utils/links';

const PEXELS_URL = 'https://www.pexels.com/';

function randomOther(photos, currentId) {
  if (photos.length < 2) return photos[0] || null;
  const others = photos.filter((photo) => photo.id !== currentId);
  return others[Math.floor(Math.random() * others.length)];
}

export default function PhotoEasterEgg({ onReady }) {
  const { t, localeTag } = useI18n();
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const controller = useRef(null);

  useEffect(() => {
    onReady?.();
    return () => controller.current?.abort();
  }, [onReady]);

  async function search(event) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2 || term.length > 80) {
      setError('invalid');
      return;
    }

    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(true);
    setError('');
    setPhotos([]);
    setCurrent(null);
    setSearched(true);

    try {
      const url = new URL('/api/pexels', window.location.origin);
      url.searchParams.set('query', term);
      url.searchParams.set('locale', localeTag);
      const response = await fetch(url, { signal: nextController.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'failed');
      const results = Array.isArray(data.photos) ? data.photos : [];
      setPhotos(results);
      setCurrent(randomOther(results, null));
    } catch (cause) {
      if (cause.name !== 'AbortError') setError(cause.message === 'rate_limit' || cause.message === 'unavailable' ? cause.message : 'failed');
    } finally {
      if (controller.current === nextController) {
        controller.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <main className={`foto-egg${current ? ' foto-egg-com-foto' : ''}`}>
      <div className="foto-egg-orbita" aria-hidden="true" />
      <section className="foto-egg-conteudo" aria-labelledby="foto-egg-titulo">
        <h1 id="foto-egg-titulo">{t('photoEgg.title')}</h1>

        <form className="foto-egg-busca" onSubmit={search}>
          <label className="sr-only" htmlFor="photo-search-input">{t('photoEgg.label')}</label>
          <div className="foto-egg-busca-linha">
            <input id="photo-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('photoEgg.placeholder')} maxLength={80} autoComplete="off" />
            <button type="submit" disabled={loading} aria-label={loading ? t('photoEgg.loading') : t('photoEgg.search')} title={t('photoEgg.search')}>
              {loading ? <FiLoader className="foto-egg-spinner" aria-hidden="true" /> : <FiSearch aria-hidden="true" />}
            </button>
          </div>
        </form>

        <div className="foto-egg-resultado" aria-live="polite">
          {error && <p className="foto-egg-aviso" role="alert">{t(`photoEgg.${error}`)}</p>}
          {!error && !loading && searched && photos.length === 0 && current === null && (
            <p className="foto-egg-aviso foto-egg-vazio"><TbPhotoOff aria-hidden="true" /><span>{t('photoEgg.empty')}</span></p>
          )}
          {current && (
            <figure className="foto-egg-foto" key={current.id}>
              <a href={current.url} {...EXTERNAL_LINK_PROPS} aria-label={t('photoEgg.viewOnPexels')}>
                <img src={current.src} alt={current.alt || t('photoEgg.fallbackAlt')} decoding="async" />
              </a>
              <figcaption>
                <span>{t('photoEgg.photoBy')} <a href={current.photographerUrl || current.url} {...EXTERNAL_LINK_PROPS}>{current.photographer || 'Pexels'}</a></span>
                <a href={PEXELS_URL} {...EXTERNAL_LINK_PROPS}>Pexels ↗</a>
              </figcaption>
            </figure>
          )}
          {current && photos.length > 1 && <button className="foto-egg-outra" type="button" onClick={() => setCurrent(randomOther(photos, current.id))}>{t('photoEgg.another')}</button>}
        </div>
      </section>
    </main>
  );
}
