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

export async function createComment({ name, message, rating }) {
  await unwrap(requireSupabase().from('comments').insert({ name, message, rating }));
}
