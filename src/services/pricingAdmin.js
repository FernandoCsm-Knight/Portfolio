import { requireSupabase, unwrap } from './supabase';
import { COLUMNS as PUBLIC_COLUMNS } from './pricing';

const COLUMNS = `${PUBLIC_COLUMNS},updated_at`;

/* Sem `.eq('active', true)`: a política de leitura já entrega os rascunhos para
   quem é admin, e é justamente aqui que eles precisam aparecer. */
export async function listRatesForAdmin() {
  return unwrap(requireSupabase()
    .from('hourly_rates')
    .select(COLUMNS)
    .order('position', { ascending: true }));
}

export async function createRate(fields) {
  return unwrap(requireSupabase()
    .from('hourly_rates')
    .insert(fields)
    .select(COLUMNS)
    .single());
}

export async function updateRate(id, fields) {
  return unwrap(requireSupabase()
    .from('hourly_rates')
    .update(fields)
    .eq('id', id)
    .select(COLUMNS)
    .single());
}

export async function deleteRate(id) {
  await unwrap(requireSupabase().from('hourly_rates').delete().eq('id', id));
}

/* Mesmo critério do painel de projetos: trocar a posição das duas linhas
   vizinhas basta para reordenar meia dúzia de itens. */
export async function swapRatePositions(a, b) {
  const supabase = requireSupabase();
  await Promise.all([
    unwrap(supabase.from('hourly_rates').update({ position: b.position }).eq('id', a.id)),
    unwrap(supabase.from('hourly_rates').update({ position: a.position }).eq('id', b.id)),
  ]);
}
