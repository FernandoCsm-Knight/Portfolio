import { abrirDemandas } from './contactCrypto';
import { requireSupabase, unwrap } from './supabase';

/* Só o /admin importa este módulo. Manter separado de contact.js é o que
   impede as consultas de moderação de entrarem no bundle de quem apenas
   visita /contact — mesma divisão que comments.js / commentModeration.js. */

/* Nome, e-mail, empresa e mensagem não são mais colunas: vêm dentro de
   `payload_enc` e só existem depois de decifrar no navegador. O que sobrou em
   claro é o que o painel precisa para filtrar e ordenar sem abrir nada. */
const CAMPOS = 'id,subject,status,created_at,read_at,payload_enc';

export const INBOX_FILTERS = [
  { value: 'new', label: 'Novas' },
  { value: 'read', label: 'Lidas' },
  { value: 'archived', label: 'Arquivadas' },
];

/**
 * Com o cofre trancado a consulta ainda acontece e as linhas voltam — só que
 * com `decifrada: false`. É o que permite ao painel mostrar quantas demandas
 * existem, e em que fila, antes de pedir a senha.
 */
export async function listContactRequests(status = 'new') {
  return abrirDemandas(await unwrap(requireSupabase()
    .from('contact_requests')
    .select(CAMPOS)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100)));
}

export async function countNewContactRequests() {
  const { count, error } = await requireSupabase()
    .from('contact_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');

  if (error) throw error;
  return count ?? 0;
}

export async function setContactRequestStatus(id, status) {
  return unwrap(requireSupabase()
    .from('contact_requests')
    .update({ status })
    .eq('id', id)
    .select('id,status')
    .single());
}

/**
 * Avisa o painel de uma demanda nova assim que ela entra na tabela.
 *
 * `onStatus` recebe o estado do canal porque o Realtime pode simplesmente não
 * estar habilitado para a tabela (o bloco que a publica em
 * supabase/contact_requests.sql é tolerante a falhas de propósito). Quem chama
 * usa isso para cair em consulta periódica em vez de ficar mudo até um F5.
 *
 * @returns {() => void} cancela a assinatura.
 */
export function subscribeToContactRequests({ onInsert, onStatus }) {
  const supabase = requireSupabase();
  const canal = supabase
    .channel('contact-requests-inbox')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'contact_requests' },
      (payload) => onInsert?.(payload.new),
    )
    .subscribe((status) => onStatus?.(status));

  return () => { supabase.removeChannel(canal); };
}
