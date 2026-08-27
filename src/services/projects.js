import { requireSupabase, supabaseConfigured, unwrap } from './supabase';

export const projectsConfigured = supabaseConfigured;

export const PROJECT_COVERS_BUCKET = 'project-covers';

/* Reaproveitada por projectsAdmin.js (com ,updated_at anexado) — evita que as
   duas listas de colunas divirjam quando um campo for adicionado. */
export const COLUMNS = 'id,position,title_pt,title_en,title_es,description_pt,description_en,description_es,tags,href,image_path';

export function getProjectImageUrl(imagePath) {
  if (!imagePath) return null;
  return requireSupabase().storage.from(PROJECT_COVERS_BUCKET).getPublicUrl(imagePath).data.publicUrl;
}

/* `locale` já vem validado pelo I18nProvider (pt/en/es); o fallback para
   português cobre um projeto cadastrado antes de um novo idioma existir. */
export function localizeProject(row, locale) {
  const title = row[`title_${locale}`] || row.title_pt;
  const description = row[`description_${locale}`] || row.description_pt;
  return {
    id: row.id,
    title,
    description,
    tags: row.tags ?? [],
    href: row.href,
    imageUrl: getProjectImageUrl(row.image_path),
  };
}

export async function listProjects({ signal } = {}) {
  let query = requireSupabase()
    .from('projects')
    .select(COLUMNS)
    .order('position', { ascending: true });

  if (signal) query = query.abortSignal(signal);

  return unwrap(query);
}
