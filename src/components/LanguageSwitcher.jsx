import { useI18n } from '../i18n/context';

const OPTIONS = ['pt', 'es', 'en'];

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="seletor-idioma" role="group" aria-label={t('language.label')}>
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={locale === option ? 'ativo' : undefined}
          aria-pressed={locale === option}
          aria-label={t(`language.${option}`)}
          onClick={() => setLocale(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
