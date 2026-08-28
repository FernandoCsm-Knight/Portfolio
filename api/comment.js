import { autorizarEnvio, clienteAdmin, texto } from './_lib.js';

/**
 * Recebe uma avaliação da home, confere o reCAPTCHA e grava como pendente.
 *
 * `moderation_status` não é enviado de propósito: a coluna tem `default
 * 'pending'` no DDL, então a avaliação nasce aguardando moderação mesmo com a
 * service role, que passa por cima da RLS onde essa regra também morava.
 */
export default async function handler(request, response) {
  const autorizado = await autorizarEnvio(request, response, 'comment');
  if (!autorizado) return;

  const { config, corpo } = autorizado;
  const nota = Number(corpo.rating);
  const linha = {
    name: texto(corpo.name, 40),
    message: texto(corpo.message, 500),
    rating: Number.isInteger(nota) && nota >= 1 && nota <= 5 ? nota : 5,
  };

  if (linha.name.length < 2 || linha.message.length < 2) {
    response.status(400).json({ error: 'invalid_fields' });
    return;
  }

  const { error } = await clienteAdmin(config).from('comments').insert(linha);
  if (error) {
    console.error('[api] comment insert:', error.message);
    response.status(500).json({ error: 'insert_failed' });
    return;
  }

  response.status(201).json({ ok: true });
}
