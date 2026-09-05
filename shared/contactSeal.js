/**
 * Caixa selada das demandas de contato: ECDH P-256 → HKDF-SHA256 → AES-256-GCM.
 *
 * A ideia inteira cabe numa frase: /api/contact só tem a chave PÚBLICA, então
 * quem vaza a env da Vercel junto com um dump do banco continua sem conseguir
 * ler nada. A privada só existe no navegador do /admin, e só depois da senha.
 *
 * Fica em shared/ porque as duas pontas precisam derivar a MESMA chave, e as
 * duas pontas moram em bundles diferentes (a função serverless em /api, o painel
 * em /src). Duplicar a derivação nos dois lugares é garantir que um dia elas
 * divirjam por um byte de `info` e as mensagens antigas parem de abrir.
 *
 * Sem dependência: `crypto.subtle` é nativo no Node 18+ (runtime das funções da
 * Vercel) e em qualquer navegador sob HTTPS.
 *
 * POR QUE NÃO RSA: com RSA-OAEP de 2048 bits o texto cifrado cabe em ~190
 * bytes, e `message` vai até 2000 caracteres. Todo uso real de RSA para
 * conteúdo é híbrido — RSA só envelopa uma chave AES. ECDH P-256 faz esse mesmo
 * papel com chave menor e sem padding para errar.
 */

const CURVA = { name: 'ECDH', namedCurve: 'P-256' };
const ROTULO = 'contact_requests.v1';

/* 600k é o piso que o OWASP recomenda hoje para PBKDF2-HMAC-SHA256. O número
   vai gravado no pacote, e não só aqui: quando ele subir, as chaves geradas
   antes precisam continuar abrindo com o custo com que foram fechadas. */
const ITERACOES_PADRAO = 600000;

/**
 * Contexto criptográfico da linha, usado como `info` do HKDF e como dado
 * autenticado do GCM.
 *
 * Amarrar o `id` aqui é o que impede trocar o `payload_enc` de uma linha pelo
 * de outra: o texto cifrado só abre na linha em que foi gravado. Por isso o id
 * é sorteado em /api/contact e vai explícito no insert, em vez de sair do
 * `gen_random_uuid()` do Postgres — quem cifra precisa saber o id antes.
 */
function contexto(id) {
  return new TextEncoder().encode(`${ROTULO}|${id}`);
}

export function paraBase64(dados) {
  const bytes = new Uint8Array(dados);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 1) binario += String.fromCharCode(bytes[i]);
  return btoa(binario);
}

export function deBase64(texto) {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/* A pública viaja como ponto bruto em base64 (65 bytes, ~88 caracteres) em vez
   de JWK: é um valor só para colar no painel da Vercel, sem chaves de objeto
   nem aspas para uma variável de ambiente estragar. */
function importarPublica(bruta) {
  const bytes = typeof bruta === 'string' ? deBase64(bruta) : bruta;
  return crypto.subtle.importKey('raw', bytes, CURVA, false, []);
}

export function importarPrivada(jwk) {
  return crypto.subtle.importKey('jwk', jwk, CURVA, false, ['deriveBits']);
}

/**
 * O segredo do ECDH nunca vira chave AES direto: passa por HKDF, que é o que
 * transforma a coordenada X do ponto — que não é uniforme — em 256 bits
 * utilizáveis como chave.
 *
 * A pública efêmera entra como `salt`. Ela muda a cada mensagem, então cada
 * linha tem uma chave AES própria mesmo com o par fixo — sem isso, repetir um
 * IV em duas mensagens quebraria as duas de uma vez.
 */
async function derivarChave({ privada, publica, epkBruta, id, uso }) {
  const segredo = await crypto.subtle.deriveBits({ name: 'ECDH', public: publica }, privada, 256);
  const material = await crypto.subtle.importKey('raw', segredo, 'HKDF', false, ['deriveKey']);

  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: epkBruta, info: contexto(id) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    [uso],
  );
}

/**
 * Sela um objeto para o dono da chave pública. Roda em /api/contact.
 *
 * @param {object} args
 * @param {string} args.chavePublica ponto P-256 bruto em base64 (CONTACT_PUBLIC_KEY)
 * @param {string} args.id uuid da linha que vai receber o pacote
 * @param {object} args.dados o que sairia de claro no banco (nome, e-mail, texto…)
 * @returns {Promise<object>} pacote para gravar em `payload_enc`
 */
export async function selar({ chavePublica, id, dados }) {
  const destino = await importarPublica(chavePublica);

  /* Par efêmero, descartado ao fim da função: é ele que dá sigilo adiante por
     mensagem. A privada efêmera não é guardada em lugar nenhum, então nem quem
     assumir o servidor depois consegue reabrir o que já passou por aqui. */
  const efemero = await crypto.subtle.generateKey(CURVA, true, ['deriveBits']);
  const epkBruta = new Uint8Array(await crypto.subtle.exportKey('raw', efemero.publicKey));

  const chave = await derivarChave({
    privada: efemero.privateKey, publica: destino, epkBruta, id, uso: 'encrypt',
  });

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifra = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: contexto(id) },
    chave,
    new TextEncoder().encode(JSON.stringify(dados)),
  );

  return { v: 1, epk: paraBase64(epkBruta), iv: paraBase64(iv), ct: paraBase64(cifra) };
}

/**
 * Abre um pacote. Roda no navegador do /admin, com a privada já destravada.
 *
 * @param {object} args
 * @param {CryptoKey} args.chavePrivada
 * @param {string} args.id uuid da linha — precisa ser o mesmo do selamento
 * @param {object} args.pacote conteúdo de `payload_enc`
 */
export async function abrir({ chavePrivada, id, pacote }) {
  if (pacote?.v !== 1) throw new Error('PACOTE_VERSAO_DESCONHECIDA');

  const epkBruta = deBase64(pacote.epk);
  const chave = await derivarChave({
    privada: chavePrivada,
    publica: await importarPublica(epkBruta),
    epkBruta,
    id,
    uso: 'decrypt',
  });

  /* Um pacote adulterado — ou movido de linha — falha aqui, na verificação da
     etiqueta do GCM. Não devolve texto errado, lança. */
  const claro = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: deBase64(pacote.iv), additionalData: contexto(id) },
    chave,
    deBase64(pacote.ct),
  );

  return JSON.parse(new TextDecoder().decode(claro));
}

/* ------------------------------------------------------------------ *
 * Guarda da chave privada. O mesmo formato é escrito pelo script de
 * geração e lido pelo painel, então os dois lados vivem aqui.
 * ------------------------------------------------------------------ */

async function chaveDaSenha({ senha, sal, iteracoes, uso }) {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    [uso],
  );
}

/** Fecha a chave privada (JWK) sob uma senha. Usado pelo script de geração. */
export async function protegerComSenha(jwk, senha, iteracoes = ITERACOES_PADRAO) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chave = await chaveDaSenha({ senha, sal, iteracoes, uso: 'encrypt' });

  const cifra = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, chave, new TextEncoder().encode(JSON.stringify(jwk)),
  );

  return {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iteracoes,
    sal: paraBase64(sal),
    iv: paraBase64(iv),
    ct: paraBase64(cifra),
  };
}

/** Devolve o JWK da privada. Lança se a senha estiver errada (falha do GCM). */
export async function abrirComSenha(pacote, senha) {
  if (pacote?.v !== 1) throw new Error('COFRE_VERSAO_DESCONHECIDA');

  const chave = await chaveDaSenha({
    senha,
    sal: deBase64(pacote.sal),
    /* Do pacote, não da constante: uma chave gerada quando o padrão era menor
       tem de continuar abrindo com o custo com que foi fechada. */
    iteracoes: pacote.iteracoes,
    uso: 'decrypt',
  });

  const claro = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: deBase64(pacote.iv) }, chave, deBase64(pacote.ct),
  );

  return JSON.parse(new TextDecoder().decode(claro));
}
