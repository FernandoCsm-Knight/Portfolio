import { abrir, abrirComSenha, importarPrivada } from '../../shared/contactSeal.js';

/* Cofre da chave privada da caixa de entrada, no navegador do /admin.
 *
 * O que está gravado no localStorage é o arquivo chave-contato.json — a privada
 * já fechada sob a senha. Ele fica ali para você não ter que reencontrar o
 * arquivo a cada sessão; sozinho, não abre nada.
 *
 * A chave destravada mora em memória, e só. Recarregar a página tranca de novo,
 * de propósito: `sessionStorage` deixaria a privada legível para qualquer script
 * que rodasse no /admin, e o ganho seria não redigitar uma senha por sessão.
 *
 * `extractable: false` no import: mesmo com a página comprometida, a chave não
 * sai do navegador — dá para pedir que ela decifre, não para copiá-la.
 */

const ARMAZEM = 'portfolio-chave-contato';

let privada = null;

function localStorageDisponivel() {
  /* Uma janela anônima com dados de site bloqueados lança no acesso, não
     devolve null — sem o try o painel inteiro morre no import. */
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function lerCofre() {
  if (!localStorageDisponivel()) return null;
  try {
    const bruto = window.localStorage.getItem(ARMAZEM);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function cofreGuardado() {
  return lerCofre() !== null;
}

export function cofreDestravado() {
  return privada !== null;
}

/**
 * Guarda o conteúdo de chave-contato.json. Não destrava: o painel pede a senha
 * em seguida, e é ela que diz se o arquivo colado é mesmo o certo.
 *
 * @param {string} texto o JSON colado pelo usuário
 */
export function guardarCofre(texto) {
  const pacote = JSON.parse(texto);

  /* Conferência rasa só para transformar "colei o arquivo errado" num erro
     imediato, em vez de numa falha de senha três telas adiante. */
  if (pacote?.v !== 1 || !pacote.ct || !pacote.sal || !pacote.iv) {
    throw new Error('COFRE_INVALIDO');
  }

  if (!localStorageDisponivel()) throw new Error('SEM_ARMAZENAMENTO');
  window.localStorage.setItem(ARMAZEM, JSON.stringify(pacote));
}

export function esquecerCofre() {
  privada = null;
  if (localStorageDisponivel()) window.localStorage.removeItem(ARMAZEM);
}

/** Deriva a chave a partir da senha e a mantém em memória até recarregar. */
export async function destravar(senha) {
  const pacote = lerCofre();
  if (!pacote) throw new Error('SEM_COFRE');

  /* Senha errada cai aqui, na etiqueta do GCM. O PBKDF2 do pacote (600k
     iterações) leva ~1s num desktop: é lento para você uma vez por sessão, e
     lento para quem tentar adivinhar a senha um bilhão de vezes. */
  privada = await importarPrivada(await abrirComSenha(pacote, senha));
}

export function trancar() {
  privada = null;
}

/**
 * Abre uma linha de `contact_requests`.
 *
 * Nunca lança: uma demanda que não abre não pode derrubar a lista inteira —
 * pode ser uma linha gravada com o par anterior, e as outras continuam
 * legíveis. Quem chama decide o que mostrar pelo `decifrada`.
 *
 * @param {object} linha com `id` e `payload_enc`
 */
export async function abrirDemanda(linha) {
  if (!privada || !linha?.payload_enc) return { ...linha, decifrada: false };

  try {
    const dados = await abrir({ chavePrivada: privada, id: linha.id, pacote: linha.payload_enc });
    return { ...linha, ...dados, decifrada: true };
  } catch {
    return { ...linha, decifrada: false };
  }
}

export function abrirDemandas(linhas) {
  return Promise.all(linhas.map(abrirDemanda));
}
