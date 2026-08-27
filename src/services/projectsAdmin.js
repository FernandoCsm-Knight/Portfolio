import { requireSupabase } from './supabase';
import { PROJECT_COVERS_BUCKET } from './projects';

const COLUMNS = 'id,position,title_pt,title_en,title_es,description_pt,description_en,description_es,tags,href,image_path,updated_at';

export async function listProjectsForAdmin() {
  const { data, error } = await requireSupabase()
    .from('projects')
    .select(COLUMNS)
    .order('position', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createProject(fields) {
  const { data, error } = await requireSupabase()
    .from('projects')
    .insert(fields)
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(id, fields) {
  const { data, error } = await requireSupabase()
    .from('projects')
    .update(fields)
    .eq('id', id)
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id) {
  const { error } = await requireSupabase().from('projects').delete().eq('id', id);
  if (error) throw error;
}

/* Só troca a posição das duas linhas vizinhas — não há necessidade de uma
   renumeração completa nem de arrastar-e-soltar para reordenar 4 ou 5 cards. */
export async function swapProjectPositions(a, b) {
  const supabase = requireSupabase();
  const [{ error: errorA }, { error: errorB }] = await Promise.all([
    supabase.from('projects').update({ position: b.position }).eq('id', a.id),
    supabase.from('projects').update({ position: a.position }).eq('id', b.id),
  ]);
  if (errorA) throw errorA;
  if (errorB) throw errorB;
}

export async function uploadProjectImage(projectId, file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${projectId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await requireSupabase()
    .storage
    .from(PROJECT_COVERS_BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false });

  if (error) throw error;
  return path;
}

export async function removeProjectImage(path) {
  if (!path) return;
  const { error } = await requireSupabase().storage.from(PROJECT_COVERS_BUCKET).remove([path]);
  if (error) throw error;
}
