import { useI18n } from '../i18n/context';

export default function LoadingScreen({ visible, route }) {
  const { t } = useI18n();
  const routeKey = { '/': 'home', '/projects': 'projects', '/about': 'about', '/pricing': 'pricing', '/contact': 'contact' }[route] ?? 'home';
  return (
    <div
      className={`tela-carregamento${visible ? ' visivel' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={visible ? t('loading.aria') : undefined}
      aria-hidden={!visible}
    >
      <div className="carregamento-conteudo">
        <div className="sonar-carregamento" aria-hidden="true">
          <i className="sonar-varredura" />
          <i className="sonar-centro" />
          <i className="sonar-blip sonar-blip-um" />
          <i className="sonar-blip sonar-blip-dois" />
        </div>

        <p className="carregamento-etiqueta">{t('loading.system')}</p>
        <p className="carregamento-mensagem">{t(`loading.${routeKey}`)}</p>
        <span className="carregamento-linha" aria-hidden="true"><i /></span>
      </div>
    </div>
  );
}
