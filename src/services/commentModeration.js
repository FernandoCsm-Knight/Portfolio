import { requireSupabase } from './supabase';

export async function signInAdmin(email, password) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function getAdminSession() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function isCommentAdmin(userId) {
  const { data, error } = await requireSupabase()
    .from('comment_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function listCommentsForModeration(status = 'pending') {
  const { data, error } = await requireSupabase()
    .from('comments')
    .select('id,name,message,rating,created_at,moderation_status,moderated_at')
    .eq('moderation_status', status)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}

export async function moderateComment(id, moderationStatus) {
  const { data, error } = await requireSupabase()
    .from('comments')
    .update({ moderation_status: moderationStatus })
    .eq('id', id)
    .select('id,moderation_status')
    .single();

  if (error) throw error;
  return data;
}
