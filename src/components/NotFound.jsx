import { useEffect } from 'react';
import { useI18n } from '../i18n/context';

/* Rota fora de ROTAS (App.jsx). Página estática — sem cena WebGL — que
   reaproveita o fundo do caderno de bordo e libera a interface no próprio
   efeito de montagem, já que não há primeiro frame de canvas para esperar. */
function NotFound({ onReady }) {
  const { t } = useI18n();

  useEffect(() => {
    onReady?.();
    const tituloAnterior = document.title;
    document.title = `404 · ${tituloAnterior}`;
    return () => { document.title = tituloAnterior; };
  }, [onReady]);

  return (
    <>
      <div id="fundo" className="fundo-caderno" />
      <div id="vinheta" />
      <main className="pagina-404">
        <p className="pagina-404-codigo" aria-hidden="true">{t('notFound.code')}</p>
        <h1 className="pagina-404-titulo">{t('notFound.title')}</h1>
        <p className="pagina-404-corpo">{t('notFound.body')}</p>
        <a className="pagina-404-voltar" href="/">{t('notFound.back')}</a>
      </main>
    </>
  );
}

export default NotFound;
