/**
 * Gera o par de chaves da caixa de entrada. Roda uma vez, na sua máquina.
 *
 *   node scripts/gerar-chave-contato.mjs
 *
 * Sai daqui:
 *   - CONTACT_PUBLIC_KEY, para colar nas variáveis da Vercel. Pública: quem a
 *     tiver consegue escrever uma demanda, nunca ler uma.
 *   - chave-contato.json, a privada fechada sob a senha que você digitar. É
 *     ela que você cola uma vez no /admin.
 *
 * A privada em claro não é escrita em disco nem impressa em lugar nenhum: sai
 * da memória deste processo direto para dentro do AES. O par de backup é
 * "chave-contato.json + senha", e os dois precisam ir para o seu gerenciador de
 * senhas ANTES de você ligar isso em produção — perder qualquer um dos dois
 * torna toda a caixa de entrada ilegível, inclusive para você.
 */

import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { paraBase64, protegerComSenha } from '../shared/contactSeal.js';

const DESTINO = 'chave-contato.json';
const MINIMO = 12;

/**
 * Pergunta sem eco. O `terminal: true` do readline devolve cada tecla para a
 * saída; trocar `write` durante a pergunta é o que evita a senha ficar no
 * scrollback do terminal — e no histórico do shell, se você rolar para cima.
 */
function perguntarSenha(rotulo) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const escrever = process.stdout.write.bind(process.stdout);
    let mudo = false;

    process.stdout.write = (pedaco, ...resto) => (mudo ? true : escrever(pedaco, ...resto));

    rl.question(rotulo, (resposta) => {
      process.stdout.write = escrever;
      escrever('\n');
      rl.close();
      resolve(resposta);
    });

    /* Depois do `question`, para o próprio rótulo ainda aparecer. */
    mudo = true;
  });
}

/* Sem TTY não há como esconder o eco, e a senha acabaria no log de quem quer
   que esteja chamando este script. Recusar é melhor do que aceitar por um cano
   que grava. */
if (!process.stdin.isTTY) {
  console.error('Este script pede uma senha e precisa de um terminal interativo.');
  console.error('Rode direto no seu shell: node scripts/gerar-chave-contato.mjs');
  process.exit(1);
}

const senha = await perguntarSenha(`Senha da chave (mín. ${MINIMO} caracteres): `);
if (senha.length < MINIMO) {
  console.error(`\nSenha curta demais. O PBKDF2 encarece cada tentativa, mas não salva uma senha adivinhável.`);
  process.exit(1);
}

const confirmacao = await perguntarSenha('Repita a senha: ');
if (senha !== confirmacao) {
  console.error('\nAs senhas não conferem. Nada foi gerado.');
  process.exit(1);
}

const par = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const publica = paraBase64(await crypto.subtle.exportKey('raw', par.publicKey));
const cofre = await protegerComSenha(await crypto.subtle.exportKey('jwk', par.privateKey), senha);

/* `wx`: falha se o arquivo já existir. Sobrescrever aqui apagaria a única cópia
   de uma chave em uso e, com ela, todas as mensagens já recebidas. */
writeFileSync(DESTINO, `${JSON.stringify(cofre, null, 2)}\n`, { flag: 'wx' });

console.log(`
Par gerado.

1) Vercel → Settings → Environment Variables (e no seu .env.local):

CONTACT_PUBLIC_KEY=${publica}

2) ${DESTINO} guarda a privada fechada sob a sua senha.
   - cole o conteúdo dele uma vez em /admin → Mensagens;
   - guarde o arquivo E a senha no gerenciador de senhas;
   - ele está no .gitignore, e é para continuar assim.

Sem os dois, nenhuma demanda recebida volta a ser legível.
`);
