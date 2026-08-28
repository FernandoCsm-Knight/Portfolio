import { createClient } from '@supabase/supabase-js';

/* Arquivos com `_` na frente não viram rota na Vercel — este é código
   compartilhado por /api/contact e /api/comment, não um endpoint. */

const RECAPTCHA_API = 'https://recaptchaenterprise.googleapis.com/v1';

/* 0.5 é o corte que a própria documentação do reCAPTCHA sugere como ponto de
   partida. Ajustável por ambiente: dá para apertar depois de ver a distribuição
   real de notas no console do Google, sem novo deploy de código. */
const NOTA_MINIMA = Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.5);

/* Com RECAPTCHA_DEBUG=1 a recusa devolve o motivo no corpo da resposta, em vez
   de só no log da função. É para a fase de ajuste: sem isso, descobrir se um 403
   foi nota baixa, domínio errado ou ação divergente exige abrir o log da Vercel a
   cada tentativa. Desligado por padrão — em produção o motivo entregaria a quem
   está sondando exatamente qual limite contornar. */
const DEPURAR = /^(1|true)$/i.test(process.env.RECAPTCHA_DEBUG || '');

function lerConfig() {
  return {
    projectId: process.env.RECAPTCHA_PROJECT_ID,
    apiKey: process.env.RECAPTCHA_API_KEY,
    /* As `VITE_*` também chegam aqui: a Vercel injeta todas as variáveis no
       runtime da função, com prefixo ou sem. O prefixo decide o outro sentido —
       o que o Vite copia para dentro do bundle —, não o que o Node enxerga.
       Uma fonte só para cada valor: duas que precisam bater é uma que vai
       dessincronizar. */
    siteKey: process.env.VITE_RECAPTCHA_SITE_KEY,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    /* Geração nova de chaves do Supabase: `sb_secret_…` no lugar do JWT
       `service_role`. Mesmo poder — ignora a RLS —, mas revogável sozinha, sem
       derrubar a chave publishable junto. */
    secretKey: process.env.SUPABASE_SECRET_KEY,
  };
}

/**
 * Consulta a nota do token no reCAPTCHA Enterprise.
 *
 * Pela API REST, e não pelo pacote `@google-cloud/recaptcha-enterprise`: o SDK
 * fala gRPC e exige Application Default Credentials (um JSON de conta de
 * serviço inteiro numa variável de ambiente). Aqui é um `fetch` com chave de
 * API — mesma avaliação, sem dependência nova numa função serverless.
 */
async function avaliarToken({ token, acao, config }) {
  const resposta = await fetch(
    `${RECAPTCHA_API}/projects/${config.projectId}/assessments?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: { token, siteKey: config.siteKey, expectedAction: acao },
      }),
    },
  );

  if (!resposta.ok) {
    return { ok: false, motivo: `http_${resposta.status}` };
  }

  const dados = await resposta.json();

  if (!dados.tokenProperties?.valid) {
    return { ok: false, motivo: dados.tokenProperties?.invalidReason || 'token_invalido' };
  }

  /* A ação vai assinada dentro do token. Sem esta conferência, um token obtido
     no formulário de avaliações serviria para enviar uma demanda de contato. */
  if (dados.tokenProperties.action !== acao) {
    return { ok: false, motivo: `acao_${dados.tokenProperties.action}` };
  }

  const nota = dados.riskAnalysis?.score ?? 0;
  if (nota < NOTA_MINIMA) {
    return { ok: false, motivo: `nota_${nota}` };
  }

  return { ok: true, nota };
}

export function clienteAdmin(config) {
  /* A chave secreta passa por cima da RLS. Quem continua valendo são os CHECK
     da própria tabela (tamanhos, enums, formato de e-mail), que estão no DDL e
     não nas policies — por isso fechar o insert do anon não afrouxa validação. */
  return createClient(config.supabaseUrl, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Casca comum das duas rotas: método, configuração, token e nota. Devolve
 * `null` quando já respondeu — o handler só segue adiante no caminho feliz.
 */
export async function autorizarEnvio(request, response, acao) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'method_not_allowed' });
    return null;
  }

  const config = lerConfig();
  const faltando = Object.entries(config)
    .filter(([, valor]) => !valor)
    .map(([nome]) => nome);

  if (faltando.length > 0) {
    /* Falha fechada, de propósito: sem configuração não há verificação, e
       aceitar o envio assim mesmo transformaria um deploy com variável
       esquecida num endpoint aberto — exatamente o que se quer evitar. */
    console.error('[api] configuração incompleta:', faltando.join(', '));
    response.status(503).json({ error: 'unavailable' });
    return null;
  }

  const corpo = typeof request.body === 'string' ? safeParse(request.body) : request.body;
  if (!corpo || typeof corpo !== 'object') {
    response.status(400).json({ error: 'invalid_body' });
    return null;
  }

  if (typeof corpo.token !== 'string' || corpo.token.length === 0) {
    response.status(400).json({ error: 'missing_token' });
    return null;
  }

  const avaliacao = await avaliarToken({ token: corpo.token, acao, config });
  if (!avaliacao.ok) {
    console.warn(`[api] ${acao} recusado:`, avaliacao.motivo);
    response.status(403).json(DEPURAR
      ? { error: 'rejected', reason: avaliacao.motivo, minScore: NOTA_MINIMA }
      : { error: 'rejected' });
    return null;
  }

  /* A nota de cada envio aceito no log: é a única forma de ver a distribuição
     real do site antes de decidir se 0.5 é apertado ou frouxo demais. */
  console.log(`[api] ${acao} aceito: nota ${avaliacao.nota}`);

  return { config, corpo };
}

function safeParse(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

export function texto(valor, max) {
  return String(valor ?? '').trim().slice(0, max);
}
