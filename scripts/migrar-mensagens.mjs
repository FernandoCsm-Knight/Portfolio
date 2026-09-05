/**
 * Sela as demandas que já estavam no banco antes da criptografia.
 *
 *   node --env-file=.env.local scripts/migrar-mensagens.mjs
 *
 * Roda entre a fase 1 e a fase 2 da migração (ver
 * supabase/contact_requests_encrypt.sql). Para cada linha ainda em claro: sela
 * o conteúdo com a chave pública, grava em `payload_enc` e zera as colunas
 * antigas na MESMA atualização — assim uma queda no meio do caminho deixa cada
 * linha inteira de um lado ou do outro, nunca com as duas cópias.
 *
 * É idempotente: só toca no que ainda tem `payload_enc` nulo.
 *
 * Usa a chave secreta, que ignora a RLS. Ela vem do .env.local e não deve ser
 * digitada na linha de comando — no PowerShell, o histórico guarda.
 */

import { createClient } from '@supabase/supabase-js';
import { selar } from '../shared/contactSeal.js';

const LOTE = 200;

const url = process.env.VITE_SUPABASE_URL?.trim();
const segredo = process.env.SUPABASE_SECRET_KEY?.trim();
const chavePublica = process.env.CONTACT_PUBLIC_KEY?.trim();

const faltando = Object.entries({ VITE_SUPABASE_URL: url, SUPABASE_SECRET_KEY: segredo, CONTACT_PUBLIC_KEY: chavePublica })
  .filter(([, valor]) => !valor)
  .map(([nome]) => nome);

if (faltando.length > 0) {
  console.error(`Faltando no ambiente: ${faltando.join(', ')}.`);
  console.error('Rode com: node --env-file=.env.local scripts/migrar-mensagens.mjs');
  process.exit(1);
}

const supabase = createClient(url, segredo, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let total = 0;

for (;;) {
  const { data, error } = await supabase
    .from('contact_requests')
    .select('id,name,email,company,message')
    .is('payload_enc', null)
    .limit(LOTE);

  if (error) {
    /* 42703 é "column does not exist": a fase 2 já rodou e não há mais o que
       migrar. Vale uma mensagem clara em vez de um erro do PostgREST. */
    if (error.code === '42703') {
      console.log('As colunas em claro já foram derrubadas — nada a migrar.');
      process.exit(0);
    }
    console.error('Falha ao ler as demandas:', error.message);
    process.exit(1);
  }

  if (data.length === 0) break;

  for (const linha of data) {
    const payload_enc = await selar({
      chavePublica,
      id: linha.id,
      dados: {
        name: linha.name,
        email: linha.email,
        company: linha.company,
        message: linha.message,
      },
    });

    const { error: falha } = await supabase
      .from('contact_requests')
      .update({ payload_enc, name: null, email: null, company: null, message: null })
      .eq('id', linha.id);

    if (falha) {
      console.error(`Falha na linha ${linha.id}:`, falha.message);
      console.error(`${total} linha(s) migradas antes disso. O script é idempotente: corrija e rode de novo.`);
      process.exit(1);
    }

    total += 1;
  }

  console.log(`${total} migradas…`);
}

console.log(`
Pronto: ${total} demanda(s) seladas.

Antes da fase 2, abra /admin → Mensagens com a chave destravada e confirme que
as antigas aparecem legíveis. Só então rode
supabase/contact_requests_drop_plaintext.sql.
`);
