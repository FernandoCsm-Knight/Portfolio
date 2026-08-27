import { requireSupabase, unwrap } from './supabase';

export async function signInAdmin(email, password) {
  const { session } = await unwrap(requireSupabase().auth.signInWithPassword({ email, password }));
  return session;
}

export async function signOutAdmin() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function getAdminSession() {
  const { session } = await unwrap(requireSupabase().auth.getSession());
  return session;
}

export async function isCommentAdmin(userId) {
  const data = await unwrap(requireSupabase()
    .from('comment_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle());

  return Boolean(data);
}

export async function listCommentsForModeration(status = 'pending') {
  return unwrap(requireSupabase()
    .from('comments')
    .select('id,name,message,rating,created_at,moderation_status,moderated_at')
    .eq('moderation_status', status)
    .order('created_at', { ascending: false })
    .limit(100));
}

export async function moderateComment(id, moderationStatus) {
  return unwrap(requireSupabase()
    .from('comments')
    .update({ moderation_status: moderationStatus })
    .eq('id', id)
    .select('id,moderation_status')
    .single());
}
