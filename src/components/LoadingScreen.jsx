const MENSAGENS = {
  '/': 'PREPARANDO O MERGULHO',
  '/projetos': 'TRAÇANDO CARTA DE EXPEDIÇÕES',
  '/sobre': 'ABRINDO O CADERNO DE BORDO',
};

export default function LoadingScreen({ visible, route }) {
  return (
    <div
      className={`tela-carregamento${visible ? ' visivel' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={visible ? 'Carregando página' : undefined}
      aria-hidden={!visible}
    >
      <div className="carregamento-conteudo">
        <div className="sonar-carregamento" aria-hidden="true">
          <i className="sonar-varredura" />
          <i className="sonar-centro" />
          <i className="sonar-blip sonar-blip-um" />
          <i className="sonar-blip sonar-blip-dois" />
        </div>

        <p className="carregamento-etiqueta">SISTEMAS DE NAVEGAÇÃO</p>
        <p className="carregamento-mensagem">{MENSAGENS[route] ?? MENSAGENS['/']}</p>
        <span className="carregamento-linha" aria-hidden="true"><i /></span>
      </div>
    </div>
  );
}
