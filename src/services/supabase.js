import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  return supabase;
}

/**
 * Cliente sem sessão, para o que é vitrine pública.
 *
 * O cliente acima guarda a sessão do /admin no localStorage e a aplica no site
 * inteiro — inclusive na home. Com ela, a policy "Admins can read all comments"
 * alcança o dono e o carrossel passa a mostrar avaliações rejeitadas, que
 * visitante nenhum enxerga. Não é vazamento (a RLS está correta), mas é um
 * carrossel mentindo sobre o próprio conteúdo para quem mais precisa confiar
 * nele.
 *
 * Filtrar por `moderation_status` na consulta não resolveria: o `anon` não tem
 * esse campo no grant de select, e no Postgres referenciar uma coluna no WHERE
 * exige privilégio sobre ela — a home quebraria para o visitante.
 *
 * `storageKey` próprio para os dois clientes não disputarem a mesma chave do
 * localStorage nem derrubarem a sessão do painel.
 */
const supabasePublico = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'portfolio-publico',
      },
    })
  : null;

export function requireSupabasePublic() {
  if (!supabasePublico) throw new Error('SUPABASE_NOT_CONFIGURED');
  return supabasePublico;
}

/* `await requireSupabase().from(...)...` sempre volta como `{ data, error }`
   em vez de rejeitar a Promise — sem isto, todo service repetia o mesmo
   `if (error) throw error; return data;` depois de cada consulta. */
export async function unwrap(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
