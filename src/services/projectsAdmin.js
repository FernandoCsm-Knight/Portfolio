import { requireSupabase, unwrap } from './supabase';
import { COLUMNS as PUBLIC_COLUMNS, PROJECT_COVERS_BUCKET } from './projects';

const COLUMNS = `${PUBLIC_COLUMNS},updated_at`;

export async function listProjectsForAdmin() {
  return unwrap(requireSupabase()
    .from('projects')
    .select(COLUMNS)
    .order('position', { ascending: true }));
}

export async function createProject(fields) {
  return unwrap(requireSupabase()
    .from('projects')
    .insert(fields)
    .select(COLUMNS)
    .single());
}

export async function updateProject(id, fields) {
  return unwrap(requireSupabase()
    .from('projects')
    .update(fields)
    .eq('id', id)
    .select(COLUMNS)
    .single());
}

export async function deleteProject(id) {
  await unwrap(requireSupabase().from('projects').delete().eq('id', id));
}

/* Só troca a posição das duas linhas vizinhas — não há necessidade de uma
   renumeração completa nem de arrastar-e-soltar para reordenar 4 ou 5 cards. */
export async function swapProjectPositions(a, b) {
  const supabase = requireSupabase();
  await Promise.all([
    unwrap(supabase.from('projects').update({ position: b.position }).eq('id', a.id)),
    unwrap(supabase.from('projects').update({ position: a.position }).eq('id', b.id)),
  ]);
}

export async function uploadProjectImage(projectId, file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${projectId}/${crypto.randomUUID()}.${extension}`;
  await unwrap(requireSupabase()
    .storage
    .from(PROJECT_COVERS_BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false }));
  return path;
}

export async function removeProjectImage(path) {
  if (!path) return;
  await unwrap(requireSupabase().storage.from(PROJECT_COVERS_BUCKET).remove([path]));
}
