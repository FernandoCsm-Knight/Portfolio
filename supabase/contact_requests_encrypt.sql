-- Fase 1 da criptografia da caixa de entrada: abre espaço para `payload_enc` e
-- solta as amarras das colunas em claro, para o backfill poder esvaziá-las.
--
-- O QUE MUDA NO MODELO DE AMEAÇA: o Supabase já cifra disco e trânsito, o que
-- cobre "roubaram o datacenter". O que sobra é dump de backup, SUPABASE_SECRET_KEY
-- vazada, sessão de admin comprometida e o próprio dashboard — e é isso que
-- `payload_enc` cobre, porque a chave que abre esses dados não está no banco
-- nem no servidor: só no navegador do /admin, atrás de uma senha.
--
-- ORDEM (nenhum passo é reversível sem a chave, leia inteiro antes):
--   1. node scripts/gerar-chave-contato.mjs, e guarde chave-contato.json + senha
--      no gerenciador de senhas;
--   2. CONTACT_PUBLIC_KEY na Vercel e no .env.local;
--   3. ESTE ARQUIVO;
--   4. deploy de /api/contact e do /admin;
--   5. node --env-file=.env.local scripts/migrar-mensagens.mjs — sela o que já
--      existe e zera as colunas em claro;
--   6. supabase/contact_requests_drop_plaintext.sql, só depois de conferir no
--      /admin que as mensagens antigas abrem.
--
-- ESTE ARQUIVO VEM ANTES DO DEPLOY, e não depois: ele é compatível para trás
-- (as colunas continuam lá, só perdem as amarras), então o código que está no ar
-- segue gravando normalmente enquanto o novo não sobe. Na ordem inversa haveria
-- uma janela com o código novo pedindo uma coluna que ainda não existe, e todo
-- envio respondendo 500.
--
-- O backfill vem DEPOIS do deploy pelo mesmo raciocínio: enquanto o código antigo
-- estiver no ar, uma demanda nova ainda nasce em claro. Só com o novo publicado é
-- que a varredura do passo 5 é definitiva.
--
-- Entre 3 e 5 a tabela aceita as duas formas: linha nova já nasce cifrada, linha
-- antiga continua legível. É essa folga que permite conferir antes de derrubar
-- as colunas antigas.

do $$
begin
  if to_regclass('public.contact_requests') is null then
    raise exception 'Rode supabase/contact_requests.sql antes deste arquivo.';
  end if;
end
$$;

-- jsonb, e não text: o pacote tem quatro campos (versão, chave efêmera, IV e
-- texto cifrado) e um dia pode ganhar um quinto. Guardar a estrutura como
-- estrutura evita ter que reencodar tudo quando isso acontecer.
alter table public.contact_requests
  add column if not exists payload_enc jsonb;

-- Nulas por enquanto: o backfill precisa esvaziá-las antes que a fase 2 as
-- derrube. `if exists` porque rodar este arquivo duas vezes é normal.
alter table public.contact_requests alter column name drop not null;
alter table public.contact_requests alter column email drop not null;
alter table public.contact_requests alter column message drop not null;

-- Os CHECK de conteúdo saem porque não há como aplicá-los: sobre texto cifrado
-- o Postgres não consegue medir um nome nem reconhecer um e-mail. A validação
-- que eles faziam foi para api/contact.js, que é quem ainda vê o texto claro.
-- Os nomes são os que o Postgres gera para um `check` declarado na coluna.
alter table public.contact_requests drop constraint if exists contact_requests_name_check;
alter table public.contact_requests drop constraint if exists contact_requests_email_check;
alter table public.contact_requests drop constraint if exists contact_requests_company_check;
alter table public.contact_requests drop constraint if exists contact_requests_message_check;

-- A policy de insert precisa parar de citar `name` e `message` AGORA: uma policy
-- que referencia uma coluna impede o `drop column` da fase 2 com erro de
-- dependência. Ela segue inalcançável (o grant de insert do anon foi revogado em
-- lock_public_writes.sql) e continua aqui pelo mesmo motivo de lá — deixar a
-- volta atrás a um `grant` de distância.
drop policy if exists "Visitors can send contact requests" on public.contact_requests;
create policy "Visitors can send contact requests"
  on public.contact_requests
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and read_at is null
    and handled_by is null
    and payload_enc is not null
  );

grant select (payload_enc) on table public.contact_requests to authenticated;

comment on column public.contact_requests.payload_enc is
  'Nome, e-mail, empresa e mensagem selados para a chave do /admin (ECDH P-256 + AES-256-GCM). Formato e derivação em shared/contactSeal.js. Só abre com a chave privada do painel — não há como decifrar isto de dentro do banco.';

notify pgrst, 'reload schema';
