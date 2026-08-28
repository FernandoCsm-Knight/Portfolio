const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim();

/* A chave de site é pública por definição — ela vai no HTML de qualquer página
   que use reCAPTCHA. O que é segredo é a chave de API do Google Cloud, e essa
   só existe nas funções em /api. */
export const recaptchaConfigured = Boolean(SITE_KEY);

let promessaScript = null;

/**
 * Baixa o script do Google na primeira vez que alguém vai enviar um formulário.
 *
 * Deixá-lo no index.html custaria a requisição — e o selo no canto da tela — em
 * toda visita, inclusive a de quem só desce o mergulho e vai embora. A cena 3D
 * já disputa a thread principal no carregamento; este script não precisa entrar
 * nessa fila.
 */
function carregarScript() {
  if (promessaScript) return promessaScript;

  promessaScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(SITE_KEY)}`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      /* Zera a promessa para uma segunda tentativa de envio poder recarregar:
         a falha costuma ser de rede, não permanente. */
      promessaScript = null;
      reject(new Error('RECAPTCHA_SCRIPT'));
    };
    document.head.appendChild(script);
  });

  return promessaScript;
}

/**
 * Token de uso único para `acao`, que o servidor confere contra a mesma string.
 * Devolve `null` quando não há chave configurada — aí a rota em /api recusa o
 * envio, que é o comportamento certo: sem verificação, não passa.
 */
export async function obterTokenRecaptcha(acao) {
  if (!recaptchaConfigured) return null;

  await carregarScript();
  await new Promise((resolve) => window.grecaptcha.enterprise.ready(resolve));
  return window.grecaptcha.enterprise.execute(SITE_KEY, { action: acao });
}
