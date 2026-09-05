import { selar } from '../shared/contactSeal.js';
import { autorizarEnvio, clienteAdmin, texto } from './_lib.js';

const ASSUNTOS = ['projeto', 'consultoria', 'pesquisa', 'outro'];

/* Pública: entra numa variável de ambiente por conveniência (trocar o par não
   exige deploy de código), não por sigilo. Quem a tiver consegue escrever uma
   demanda, nunca ler uma. */
const CHAVE_PUBLICA = process.env.CONTACT_PUBLIC_KEY?.trim();

/**
 * Recebe uma demanda do formulário de contato, confere o reCAPTCHA e grava.
 *
 * A gravação passou para cá porque o navegador não escreve mais direto no
 * Supabase: o `insert` do papel `anon` foi revogado em
 * supabase/lock_public_writes.sql. Sem isso, verificar o token seria decorativo
 * — bastaria chamar o PostgREST com a chave anon, que está no bundle.
 *
 * O conteúdo não vai em claro para a tabela: nome, e-mail, empresa e mensagem
 * são selados aqui e gravados num único `payload_enc`. Esta função só tem a
 * chave pública, então um vazamento do banco COM a env inteira da Vercel junto
 * continua sem abrir nada — a privada só existe no navegador do /admin, atrás
 * de uma senha. Ver shared/contactSeal.js.
 *
 * O texto em claro existe aqui por alguns milissegundos, o tempo de validar e
 * selar, e nunca é persistido nem registrado em log.
 */
export default async function handler(request, response) {
  if (!CHAVE_PUBLICA) {
    /* Antes do reCAPTCHA de propósito: sem chave não há onde gravar, e não faz
       sentido gastar uma avaliação do Google para descobrir isso. Falha
       fechada, como o resto da rota — nunca cair para gravar em claro. */
    console.error('[api] configuração incompleta: CONTACT_PUBLIC_KEY');
    response.status(503).json({ error: 'unavailable' });
    return;
  }

  const autorizado = await autorizarEnvio(request, response, 'contact');
  if (!autorizado) return;

  const { config, corpo } = autorizado;
  const campos = {
    name: texto(corpo.name, 80),
    email: texto(corpo.email, 160),
    company: texto(corpo.company, 80) || null,
    subject: texto(corpo.subject, 20),
    message: texto(corpo.message, 2000),
  };

  /* Os CHECK da tabela cuidavam de tamanho e formato, mas eles não alcançam
     texto cifrado: sobre `payload_enc` o Postgres não tem o que verificar. A
     validação que sobrou é esta — por isso ela cobre o e-mail e os limites
     inteiros, e não só o que dava uma mensagem de erro mais bonita. */
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email) && campos.email.length >= 5;

  if (
    campos.name.length < 2
    || !emailValido
    || campos.message.length < 10
    || !ASSUNTOS.includes(campos.subject)
  ) {
    response.status(400).json({ error: 'invalid_fields' });
    return;
  }

  /* O id sai daqui, e não do `gen_random_uuid()` da tabela: ele entra no
     contexto autenticado do pacote, então precisa existir antes de selar. É o
     que amarra o texto cifrado à linha — mover um `payload_enc` para outra
     linha o torna ilegível em vez de trocar o remetente de uma demanda. */
  const id = crypto.randomUUID();

  const linha = {
    id,
    subject: campos.subject,
    payload_enc: await selar({
      chavePublica: CHAVE_PUBLICA,
      id,
      /* `subject` fica de fora: ele já é uma coluna em claro, com quatro
         valores possíveis e nenhum dado pessoal, e é por ele que o /admin
         filtra sem precisar decifrar a caixa inteira. */
      dados: {
        name: campos.name,
        email: campos.email,
        company: campos.company,
        message: campos.message,
      },
    }),
  };

  const { error } = await clienteAdmin(config).from('contact_requests').insert(linha);
  if (error) {
    console.error('[api] contact insert:', error.message);
    response.status(500).json({ error: 'insert_failed' });
    return;
  }

  response.status(201).json({ ok: true });
}
