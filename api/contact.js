import { autorizarEnvio, clienteAdmin, texto } from './_lib.js';

const ASSUNTOS = ['projeto', 'consultoria', 'pesquisa', 'outro'];

/**
 * Recebe uma demanda do formulário de contato, confere o reCAPTCHA e grava.
 *
 * A gravação passou para cá porque o navegador não escreve mais direto no
 * Supabase: o `insert` do papel `anon` foi revogado em
 * supabase/lock_public_writes.sql. Sem isso, verificar o token seria decorativo
 * — bastaria chamar o PostgREST com a chave anon, que está no bundle.
 */
export default async function handler(request, response) {
  const autorizado = await autorizarEnvio(request, response, 'contact');
  if (!autorizado) return;

  const { config, corpo } = autorizado;
  const linha = {
    name: texto(corpo.name, 80),
    email: texto(corpo.email, 160),
    company: texto(corpo.company, 80) || null,
    subject: texto(corpo.subject, 20),
    message: texto(corpo.message, 2000),
  };

  /* Os limites de tamanho e o formato do e-mail já são CHECK na tabela; o que
     se ganha validando aqui é uma resposta 400 legível em vez de um erro do
     Postgres vazando pela rede. */
  if (linha.name.length < 2 || linha.message.length < 10 || !ASSUNTOS.includes(linha.subject)) {
    response.status(400).json({ error: 'invalid_fields' });
    return;
  }

  const { error } = await clienteAdmin(config).from('contact_requests').insert(linha);
  if (error) {
    console.error('[api] contact insert:', error.message);
    response.status(500).json({ error: 'insert_failed' });
    return;
  }

  response.status(201).json({ ok: true });
}
