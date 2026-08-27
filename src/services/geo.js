const STORAGE_KEY = 'portfolio:country';

/**
 * Palpite do próprio navegador, usado quando `/api/geo` não responde (dev
 * local, deploy fora da Vercel, requisição bloqueada).
 *
 * `maximize()` completa um idioma sem região com a região mais provável dele —
 * 'pt' vira 'pt-Latn-BR', 'en' vira 'en-Latn-US'. É um palpite de verdade, e
 * erra com quem usa o navegador num idioma que não é o do país onde está; por
 * isso ele é o plano B, e não a fonte principal.
 */
function palpitarPeloNavegador() {
  const idiomas = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const idioma of idiomas) {
    try {
      const regiao = new Intl.Locale(idioma).maximize().region;
      if (/^[A-Z]{2}$/.test(regiao || '')) return regiao;
    } catch {
      /* etiqueta de idioma malformada: tenta a próxima da lista */
    }
  }
  return null;
}

function lerCache() {
  try {
    const guardado = sessionStorage.getItem(STORAGE_KEY);
    return /^[A-Z]{2}$/.test(guardado || '') ? guardado : null;
  } catch {
    return null;
  }
}

/**
 * Código ISO 3166-1 alfa-2 do país do visitante, ou `null` se nem a borda nem o
 * navegador souberem dizer — nesse caso quem chama usa a tarifa padrão.
 *
 * O resultado fica em `sessionStorage`: o país não muda no meio da visita, e
 * sem isso cada entrada em /pricing gastaria mais uma ida ao servidor.
 */
export async function detectCountry({ signal } = {}) {
  const emCache = lerCache();
  if (emCache) return emCache;

  let pais = null;
  try {
    const resposta = await fetch('/api/geo', { signal, headers: { accept: 'application/json' } });
    if (resposta.ok) {
      const corpo = await resposta.json();
      if (/^[A-Z]{2}$/.test(corpo?.country || '')) pais = corpo.country;
    }
  } catch (erro) {
    /* Um cancelamento é o componente desmontando, não uma falha de detecção:
       propagar deixa quem chama distinguir os dois casos. */
    if (erro?.name === 'AbortError') throw erro;
  }

  pais ??= palpitarPeloNavegador();
  if (pais) {
    try { sessionStorage.setItem(STORAGE_KEY, pais); } catch { /* aba anônima */ }
  }
  return pais;
}
