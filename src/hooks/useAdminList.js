import { useCallback, useEffect, useState } from 'react';

/**
 * Estado de carregamento compartilhado pelos painéis do /admin: busca uma
 * lista, mostra "carregando"/erro, e refaz a busca quando `filterKey` muda
 * (ou sob demanda via `reload`). Para painéis sem filtro (ProjectsPanel),
 * basta omitir `filterKey` — a busca roda só uma vez, no mount.
 *
 * @param {(filterKey?: any) => Promise<any[]>} fetchFn
 * @param {*} [filterKey] valor que, ao mudar, dispara uma nova busca
 * @param {string} [errorMessage]
 */
export function useAdminList(
  fetchFn,
  filterKey,
  errorMessage = 'Não foi possível carregar os itens.',
) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setItems(await fetchFn(filterKey));
    } catch {
      setItems([]);
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, filterKey, errorMessage]);

  useEffect(() => { reload(); }, [reload]);

  return { items, setItems, loading, message, setMessage, reload };
}
