/* Envio do formulário de demanda.

   O módulo Fannar é servido pelo mesmo deploy do portfólio, então a demanda vai
   pela mesma rota e pelo mesmo serviço do formulário de contato
   (src/services/contact.js → /api/contact, na mesma origem também no
   subdomínio): reCAPTCHA, validação e selagem idênticos, e a demanda cai na
   caixa de entrada do /admin.

   Não importa services/contact.js de propósito: ele puxa o cliente do Supabase
   (~400 kB) só para conferir a configuração, e o navegador nem fala com o
   Supabase aqui — quem grava é a rota. Só o reCAPTCHA é compartilhado. */

import { obterTokenRecaptcha, recaptchaConfigured } from '../services/recaptcha';

export const briefConfigured = recaptchaConfigured;

async function createContactRequest({ name, email, company, subject, message }) {
  /* A rota confere a ação do token: a mesma do formulário de contato. */
  const token = await obterTokenRecaptcha('contact');
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, email, company, subject, message, token }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    console.error('[fannar] envio recusado:', response.status, detail ?? '');
    throw new Error(`BRIEF_${response.status}`);
  }
}

/* Os mesmos limites de api/contact.js. A mensagem leva um cabeçalho com pacote
   e modelo, então o texto da pessoa tem um pouco menos que os 2000 da rota. */
export const LIMITS = { name: [2, 80], email: 160, company: 80, message: [10, 1700] };

export function sendBrief({ name, email, company, message }) {
  /* `consultoria` é um dos assuntos aceitos pela tabela; a origem Fannar vai
     no cabeçalho da mensagem, sem exigir mudança no banco. */
  return createContactRequest({ name, email, company, subject: 'consultoria', message });
}

/* Intervalo mínimo entre dois envios no mesmo navegador. */
const COOLDOWN_KEY = 'fannar:last-brief-at';
const COOLDOWN_MS = 60000;

export function cooldownLeft(now = Date.now()) {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    return Math.max(0, Math.ceil((last + COOLDOWN_MS - now) / 1000));
  } catch {
    return 0;
  }
}

export function markSent(now = Date.now()) {
  try { localStorage.setItem(COOLDOWN_KEY, String(now)); } catch { /* só nesta sessão */ }
}

/* Os botões "Solicitar proposta" de cada pacote preenchem o formulário. */
export const PACKAGE_EVENT = 'fannar:package';
export function choosePackage(id) {
  window.dispatchEvent(new CustomEvent(PACKAGE_EVENT, { detail: id }));
}
