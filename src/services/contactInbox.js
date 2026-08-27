import { requireSupabase } from './supabase';

/* Só o /admin importa este módulo. Manter separado de contact.js é o que
   impede as consultas de moderação de entrarem no bundle de quem apenas
   visita /contato — mesma divisão que comments.js / commentModeration.js. */

const CAMPOS = 'id,name,email,company,subject,message,status,created_at,read_at';

export const INBOX_FILTERS = [
  { value: 'new', label: 'Novas' },
  { value: 'read', label: 'Lidas' },
  { value: 'archived', label: 'Arquivadas' },
];

export async function listContactRequests(status = 'new') {
  const { data, error } = await requireSupabase()
    .from('contact_requests')
    .select(CAMPOS)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
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
  const { data, error } = await requireSupabase()
    .from('contact_requests')
    .update({ status })
    .eq('id', id)
    .select('id,status')
    .single();

  if (error) throw error;
  return data;
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
