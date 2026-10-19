import { memo } from 'react';
import { useI18n } from '../i18n/context';

function Footer() {
  const { t } = useI18n();
  return <footer>FERNANDO CAMPOS SILVA DAL&apos; MARIA · <a className="footer-ano-secreto" href="/photos" aria-label={t('photoEgg.open')} title={t('photoEgg.open')}>MMXXVI</a></footer>;
}

export default memo(Footer);
