-- Fase 2: derruba as colunas em claro. Ponto sem volta — depois daqui, o que
-- não tiver sido selado pelo backfill não existe mais.
--
-- ANTES DE RODAR, confira as duas coisas:
--   1. `select count(*) from public.contact_requests where payload_enc is null;`
--      devolve 0 (rode scripts/migrar-mensagens.mjs se não devolver);
--   2. no /admin → Mensagens, com a chave destravada, as demandas ANTIGAS abrem.
--
-- O passo 2 não é zelo: é o único teste de que a chave que você guardou é mesmo
-- a que fecha o que está gravado. Um erro aí só aparece quando a cópia em claro
-- já tiver sido apagada.

do $$
declare
  em_aberto bigint;
begin
  if to_regclass('public.contact_requests') is null then
    raise exception 'Rode supabase/contact_requests.sql antes deste arquivo.';
  end if;

  -- Só conta se a coluna ainda existir: rodar este arquivo de novo, com as
  -- colunas já derrubadas, tem de ser um no-op e não um erro.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_requests' and column_name = 'message'
  ) then
    select count(*) into em_aberto
    from public.contact_requests
    where payload_enc is null;

    if em_aberto > 0 then
      raise exception
        '% linha(s) ainda sem payload_enc. Rode scripts/migrar-mensagens.mjs antes — derrubar as colunas agora apagaria essas mensagens.',
        em_aberto;
    end if;
  end if;
end
$$;

alter table public.contact_requests drop column if exists name;
alter table public.contact_requests drop column if exists email;
alter table public.contact_requests drop column if exists company;
alter table public.contact_requests drop column if exists message;

-- Só agora: enquanto existia linha antiga sem pacote, `not null` recusaria a
-- própria tabela.
alter table public.contact_requests alter column payload_enc set not null;

comment on table public.contact_requests is
  'Demandas do formulário de contato. Conteúdo cifrado em payload_enc, legível apenas no /admin com a chave privada — nem o dashboard do Supabase nem um dump do banco mostram o texto.';

notify pgrst, 'reload schema';
