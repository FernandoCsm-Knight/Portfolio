import { requireSupabase, supabaseConfigured } from './supabase';

export const commentsConfigured = supabaseConfigured;

export async function listComments({ signal } = {}) {
  let query = requireSupabase()
    .from('comments')
    .select('id,name,message,rating,created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createComment({ name, message, rating }) {
  const { error } = await requireSupabase()
    .from('comments')
    .insert({ name, message, rating });

  if (error) throw error;
}
