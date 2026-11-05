import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { currentPage } from './routes';
import { I18nProvider } from './i18n';
import './styles.css';

/* Duas páginas, dois HTML (fannar.html e fannar-metodo.html), um bundle. */
const page = currentPage();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider page={page}>
      <App page={page} />
    </I18nProvider>
  </StrictMode>,
);
