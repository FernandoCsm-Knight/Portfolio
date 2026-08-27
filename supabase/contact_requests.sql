-- Caixa de entrada das demandas enviadas pelo formulário de /contato.
--
-- Depende de public.comment_admins, criada em supabase/comments.sql: é a mesma
-- lista de quem pode entrar em /admin. Rode comments.sql antes deste arquivo.
--
-- Diferença importante em relação a public.comments: uma avaliação aprovada é
-- pública, uma demanda nunca é. Aqui o papel `anon` recebe INSERT e nada mais —
-- nem SELECT de colunas, nem policy de leitura. Quem envia não consegue reler o
-- que enviou, e nenhum visitante consegue listar o que os outros mandaram.

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.comment_admins') is null
     or to_regprocedure('public.is_portfolio_admin()') is null then
    raise exception
      'public.comment_admins/is_portfolio_admin() não existem — rode supabase/comments.sql antes deste arquivo.';
  end if;
end
$$;

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  email text not null check (
    char_length(btrim(email)) between 5 and 160
    and btrim(email) like '_%@_%._%'
  ),
  company text check (company is null or char_length(btrim(company)) between 1 and 80),
  subject text not null
    check (subject in ('projeto', 'consultoria', 'pesquisa', 'outro')),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  status text not null default 'new'
    check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  handled_by uuid references auth.users(id) on delete set null
);

create index if not exists contact_requests_status_created_at_idx
  on public.contact_requests (status, created_at desc);

-- read_at/handled_by são preenchidos aqui, e não pelo cliente: o frontend só
-- recebe permissão de escrita na coluna `status`, então não teria como forjar
-- quem leu o quê nem quando.
create or replace function public.set_contact_request_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'new' then
      new.read_at := null;
      new.handled_by := null;
    else
      new.read_at := coalesce(old.read_at, now());
      new.handled_by := (select auth.uid());
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.set_contact_request_metadata() from public, anon, authenticated;

drop trigger if exists set_contact_request_metadata on public.contact_requests;
create trigger set_contact_request_metadata
before update of status on public.contact_requests
for each row execute function public.set_contact_request_metadata();

alter table public.contact_requests enable row level security;

revoke all on table public.contact_requests from anon, authenticated;

grant insert (name, email, company, subject, message)
  on table public.contact_requests to anon, authenticated;
grant select (id, name, email, company, subject, message, status, created_at, read_at)
  on table public.contact_requests to authenticated;
grant update (status) on table public.contact_requests to authenticated;

drop policy if exists "Visitors can send contact requests" on public.contact_requests;
create policy "Visitors can send contact requests"
  on public.contact_requests
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and read_at is null
    and handled_by is null
    and char_length(btrim(name)) between 2 and 80
    and char_length(btrim(message)) between 10 and 2000
  );

drop policy if exists "Admins can read contact requests" on public.contact_requests;
create policy "Admins can read contact requests"
  on public.contact_requests
  for select
  to authenticated
  using (public.is_portfolio_admin());

drop policy if exists "Admins can triage contact requests" on public.contact_requests;
create policy "Admins can triage contact requests"
  on public.contact_requests
  for update
  to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

-- Publica a tabela no Realtime para o /admin avisar de uma demanda nova sem
-- precisar de F5. O painel funciona sem isto (cai para uma consulta a cada
-- 60s), então o bloco não falha se a publicação não existir.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'contact_requests'
     )
  then
    alter publication supabase_realtime add table public.contact_requests;
  end if;
end
$$;

comment on table public.contact_requests is
  'Demandas enviadas pelo formulário de contato. Visíveis apenas para os moderadores em comment_admins.';

notify pgrst, 'reload schema';
