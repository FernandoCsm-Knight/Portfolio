create extension if not exists pgcrypto;

create table if not exists public.comment_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

/* Checagem de admin compartilhada por comments, contact_requests e projects —
   sem isto, cada policy repetia o mesmo `exists (select ... from
   comment_admins ...)`. `stable` (não `security definer`): roda com o
   privilégio de quem chama, então continua sujeita à RLS de comment_admins
   (a policy abaixo só deixa cada usuário ler a própria linha, que é
   exatamente o que essa checagem precisa). */
create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.comment_admins
    where comment_admins.user_id = auth.uid()
  );
$$;

revoke all on function public.is_portfolio_admin() from public, anon;
grant execute on function public.is_portfolio_admin() to authenticated;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 40),
  message text not null check (char_length(btrim(message)) between 2 and 500),
  rating smallint not null default 5 check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null
);

-- Mantém o arquivo seguro para ser reaplicado caso a tabela já tenha sido criada.
alter table public.comments
  add column if not exists rating smallint not null default 5;
alter table public.comments
  add column if not exists moderation_status text not null default 'pending';
alter table public.comments
  add column if not exists moderated_at timestamptz;
alter table public.comments
  add column if not exists moderated_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'comments_moderation_status_check'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_moderation_status_check
      check (moderation_status in ('pending', 'approved', 'rejected'));
  end if;
end
$$;

create index if not exists comments_status_created_at_idx
  on public.comments (moderation_status, created_at desc);

create or replace function public.set_comment_moderation_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.moderation_status is distinct from old.moderation_status then
    if new.moderation_status in ('approved', 'rejected') then
      new.moderated_at := now();
      new.moderated_by := (select auth.uid());
    else
      new.moderated_at := null;
      new.moderated_by := null;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.set_comment_moderation_metadata() from public, anon, authenticated;

drop trigger if exists set_comment_moderation_metadata on public.comments;
create trigger set_comment_moderation_metadata
before update of moderation_status on public.comments
for each row execute function public.set_comment_moderation_metadata();

alter table public.comment_admins enable row level security;
alter table public.comments enable row level security;

revoke all on table public.comment_admins from anon, authenticated;
revoke all on table public.comments from anon, authenticated;

grant select (user_id) on table public.comment_admins to authenticated;
grant select (id, name, message, rating, created_at)
  on table public.comments to anon;
grant select (id, name, message, rating, created_at, moderation_status, moderated_at)
  on table public.comments to authenticated;
grant insert (name, message, rating)
  on table public.comments to anon, authenticated;
grant update (moderation_status)
  on table public.comments to authenticated;

drop policy if exists "Admins can read their membership" on public.comment_admins;
create policy "Admins can read their membership"
  on public.comment_admins
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Public comments are readable" on public.comments;
drop policy if exists "Visitors can create comments" on public.comments;
drop policy if exists "Approved comments are public" on public.comments;
drop policy if exists "Visitors can create pending comments" on public.comments;
drop policy if exists "Admins can read all comments" on public.comments;
drop policy if exists "Admins can moderate comments" on public.comments;

create policy "Approved comments are public"
  on public.comments
  for select
  to anon, authenticated
  using (moderation_status = 'approved');

create policy "Visitors can create pending comments"
  on public.comments
  for insert
  to anon, authenticated
  with check (
    moderation_status = 'pending'
    and moderated_at is null
    and moderated_by is null
    and char_length(btrim(name)) between 2 and 40
    and char_length(btrim(message)) between 2 and 500
    and rating between 1 and 5
  );

create policy "Admins can read all comments"
  on public.comments
  for select
  to authenticated
  using (public.is_portfolio_admin());

create policy "Admins can moderate comments"
  on public.comments
  for update
  to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

comment on table public.comments is
  'Portfolio reviews. New rows remain pending until an authorized creator approves them.';
comment on table public.comment_admins is
  'Supabase Auth users allowed to moderate portfolio reviews.';

-- Depois de criar seu usuário em Authentication > Users, execute separadamente:
-- insert into public.comment_admins (user_id)
-- select id from auth.users where email = 'SEU_EMAIL_AQUI'
-- on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
