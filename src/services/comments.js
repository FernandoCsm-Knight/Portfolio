import { obterTokenRecaptcha } from './recaptcha';
import { requireSupabase, supabaseConfigured, unwrap } from './supabase';

export const commentsConfigured = supabaseConfigured;

export async function listComments({ signal } = {}) {
  let query = requireSupabase()
    .from('comments')
    .select('id,name,message,rating,created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (signal) query = query.abortSignal(signal);

  return unwrap(query);
}

/**
 * Só a escrita mudou de caminho: `listComments` continua indo direto ao Supabase,
 * porque ler avaliações aprovadas é público e não precisa de intermediário.
 */
export async function createComment({ name, message, rating }) {
  const token = await obterTokenRecaptcha('comment');

  const resposta = await fetch('/api/comment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, message, rating, token }),
  });

  if (!resposta.ok) throw new Error(`COMMENT_${resposta.status}`);
}
