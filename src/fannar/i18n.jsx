import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CONTENT, LOCALES } from './content';

const STORAGE_KEY = 'fannar:language';

/* Escolha salva → idioma do navegador → inglês (mesma regra do portfólio). */
function detectLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LOCALES.includes(saved)) return saved;
  } catch { /* armazenamento bloqueado: segue para o navegador */ }
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const language of languages) {
    const code = String(language || '').toLowerCase().split('-')[0];
    if (LOCALES.includes(code)) return code;
  }
  return 'en';
}

const I18nContext = createContext(null);

export function I18nProvider({ page = 'home', children }) {
  const [locale, setLocaleState] = useState(detectLocale);
  const content = CONTENT[locale] ?? CONTENT.pt;

  const setLocale = useCallback((next) => {
    if (!LOCALES.includes(next)) return;
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* vale só nesta sessão */ }
    setLocaleState(next);
  }, []);

  /* O <head> do build está em português (idioma da busca que importa); ao
     trocar de idioma, título e descrição acompanham. */
  useEffect(() => {
    document.documentElement.lang = content.localeTag;
    const meta = page === 'fannar' ? content.page.meta : content.meta;
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
  }, [content, page]);

  const value = useMemo(() => ({ locale, setLocale, c: content }), [locale, setLocale, content]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n precisa estar dentro de I18nProvider');
  return value;
}
