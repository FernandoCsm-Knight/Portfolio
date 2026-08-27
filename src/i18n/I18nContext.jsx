import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext } from './context';
import { TRANSLATIONS } from './translations';

const STORAGE_KEY = 'portfolio:language';
const SUPPORTED = ['pt', 'es', 'en'];
function detectLanguage() {
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { saved = null; }
  if (SUPPORTED.includes(saved)) return saved;
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const language of languages) {
    const code = String(language || '').toLowerCase().split('-')[0];
    if (SUPPORTED.includes(code)) return code;
  }
  return 'en';
}

function getValue(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source);
}

function interpolate(value, variables) {
  if (typeof value !== 'string' || !variables) return value;
  return value.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`);
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(detectLanguage);
  const messages = TRANSLATIONS[locale] ?? TRANSLATIONS.pt;

  const setLocale = useCallback((nextLocale) => {
    if (!SUPPORTED.includes(nextLocale)) return;
    try { localStorage.setItem(STORAGE_KEY, nextLocale); } catch { /* preferência válida só nesta sessão */ }
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback((path, variables) => {
    const translated = getValue(messages, path);
    const fallback = getValue(TRANSLATIONS.pt, path);
    return interpolate(translated ?? fallback ?? path, variables);
  }, [messages]);

  useEffect(() => {
    document.documentElement.lang = messages.localeTag;
    document.title = "Fernando Dal' Maria";
  }, [messages.localeTag]);

  const value = useMemo(() => ({ locale, localeTag: messages.localeTag, setLocale, t }), [locale, messages.localeTag, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
