import { obterTokenRecaptcha, recaptchaConfigured } from './recaptcha';
import { supabaseConfigured } from './supabase';

/* As duas pontas precisam existir: sem chave de site o navegador não produz
   token, e sem Supabase a rota em /api não tem onde gravar. */
export const contactConfigured = supabaseConfigured && recaptchaConfigured;

/* Os mesmos valores estão no CHECK de `subject` em
   supabase/contact_requests.sql: mudar um lado exige mudar o outro. */
export const CONTACT_SUBJECTS = [
  { value: 'projeto', label: 'Projeto sob medida' },
  { value: 'consultoria', label: 'Consultoria técnica' },
  { value: 'pesquisa', label: 'Pesquisa ou colaboração' },
  { value: 'outro', label: 'Outro assunto' },
];

export function subjectLabel(value) {
  return CONTACT_SUBJECTS.find((item) => item.value === value)?.label ?? value;
}

export const CONTACT_LIMITS = {
  name: { min: 2, max: 80 },
  email: { max: 160 },
  company: { max: 80 },
  message: { min: 10, max: 2000 },
};

/**
 * O envio não toca mais o Supabase pelo navegador: vai para /api/contact, que
 * confere o token no reCAPTCHA e só então grava com a service role. O `insert`
 * do papel `anon` foi revogado — ver supabase/lock_public_writes.sql.
 */
export async function createContactRequest({ name, email, company, subject, message }) {
  const token = await obterTokenRecaptcha('contact');

  const resposta = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, email, company, subject, message, token }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.json().catch(() => null);
    /* O componente troca a exceção por uma mensagem genérica para o visitante,
       então sem este log o motivo que o servidor devolveu não apareceria em
       lugar nenhum do navegador. O corpo só traz o que a rota escolheu expor
       — detalhe de recusa apenas com RECAPTCHA_DEBUG ligado. */
    console.error('[contact] envio recusado:', resposta.status, detalhe ?? '');
    throw new Error(`CONTACT_${resposta.status}`);
  }
}
