create extension if not exists pgcrypto;

/* Mesma tabela de administradores e mesma is_portfolio_admin() das avaliações
   e dos projetos — o portfólio tem um dono só. */
do $$
declare
  tem_tabela boolean;
  tem_funcao boolean;
begin
  tem_tabela := to_regclass('public.comment_admins') is not null;

  /* Procurada pelo nome em pg_proc, e não por `to_regprocedure`: aquela função
     casa pela assinatura exata, então uma is_portfolio_admin que um dia ganhe um
     parâmetro passa a "não existir" — um diagnóstico errado sobre um banco que
     está certo. Aqui o que importa é se a função está lá, em qualquer forma. */
  tem_funcao := exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_portfolio_admin'
  );

  if tem_tabela and tem_funcao then
    return;
  end if;

  /* Nomear só o que falta. A mensagem antiga citava os dois objetos para uma
     condição em que qualquer um dos dois dispara, e mandava conferir o que já
     estava no lugar. */
  raise exception
    'Falta em public: %. Rode supabase/comments.sql antes deste arquivo (é idempotente).',
    concat_ws(' e ',
      case when not tem_tabela then 'a tabela comment_admins' end,
      case when not tem_funcao then 'a função is_portfolio_admin()' end
    );
end
$$;

/* Uma linha = uma modalidade cobrada num conjunto de mercados.
   `markets` guarda códigos ISO 3166-1 alfa-2 ('BR', 'PT') e/ou '*', que é a
   tarifa padrão para quem não se encaixa em nenhum mercado específico. Um array
   (em vez de uma coluna simples) evita duplicar as três modalidades inteiras só
   para dizer que Portugal paga o mesmo que o Brasil. */
create table if not exists public.hourly_rates (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0,
  markets text[] not null default '{*}',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount numeric(12,2) not null check (amount >= 0),
  title_pt text not null check (char_length(btrim(title_pt)) between 2 and 60),
  title_en text not null check (char_length(btrim(title_en)) between 2 and 60),
  title_es text not null check (char_length(btrim(title_es)) between 2 and 60),
  description_pt text not null check (char_length(btrim(description_pt)) between 10 and 400),
  description_en text not null check (char_length(btrim(description_en)) between 10 and 400),
  description_es text not null check (char_length(btrim(description_es)) between 10 and 400),
  featured boolean not null default false,
  /* Rascunho até o dono revisar: `active = false` some da página pública, mas
     continua visível no /admin. É o estado em que a semente abaixo nasce. */
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  /* Um CHECK não aceita subconsulta, então a validação de cada elemento do
     array é feita sobre a versão achatada dele — `array_to_string` é imutável. */
  constraint hourly_rates_markets_validos check (
    array_length(markets, 1) >= 1
    and array_to_string(markets, ',') ~ '^([A-Z]{2}|\*)(,([A-Z]{2}|\*))*$'
  )
);

create index if not exists hourly_rates_position_idx on public.hourly_rates (position);
/* GIN porque a consulta pública é um `overlaps` (&&) entre `markets` e o par
   {país do visitante, '*'}. */
create index if not exists hourly_rates_markets_idx on public.hourly_rates using gin (markets);

create or replace function public.set_hourly_rate_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.position is null or new.position = 0 then
    select coalesce(max(position), 0) + 1 into new.position from public.hourly_rates;
  end if;
  return new;
end;
$$;

revoke all on function public.set_hourly_rate_position() from public, anon, authenticated;

drop trigger if exists set_hourly_rate_position on public.hourly_rates;
create trigger set_hourly_rate_position
before insert on public.hourly_rates
for each row execute function public.set_hourly_rate_position();

create or replace function public.set_hourly_rate_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_hourly_rate_updated_at() from public, anon, authenticated;

drop trigger if exists set_hourly_rate_updated_at on public.hourly_rates;
create trigger set_hourly_rate_updated_at
before update on public.hourly_rates
for each row execute function public.set_hourly_rate_updated_at();

alter table public.hourly_rates enable row level security;

revoke all on table public.hourly_rates from anon, authenticated;

grant select on table public.hourly_rates to anon, authenticated;
grant insert (
  markets, currency, amount,
  title_pt, title_en, title_es,
  description_pt, description_en, description_es,
  featured, active, position
) on table public.hourly_rates to authenticated;
grant update (
  markets, currency, amount,
  title_pt, title_en, title_es,
  description_pt, description_en, description_es,
  featured, active, position
) on table public.hourly_rates to authenticated;
grant delete on table public.hourly_rates to authenticated;

drop policy if exists "Active rates are public" on public.hourly_rates;
drop policy if exists "Admins can read draft rates" on public.hourly_rates;
drop policy if exists "Admins can create rates" on public.hourly_rates;
drop policy if exists "Admins can update rates" on public.hourly_rates;
drop policy if exists "Admins can delete rates" on public.hourly_rates;

/* Duas políticas de leitura, e não uma com `active or is_portfolio_admin()`.
   O motivo é concreto: comments.sql faz
   `revoke all on function public.is_portfolio_admin() from public, anon`,
   então uma política que alcance `anon` e chame essa função falha com
   "permission denied for function is_portfolio_admin" — e derruba a leitura
   inteira da tabela para todo visitante, nem os valores ativos passam.

   Separando por papel, `anon` nunca chega a invocar a função. As duas políticas
   são permissivas, então para `authenticated` elas se somam com OR e o dono
   continua enxergando os rascunhos. */
create policy "Active rates are public"
  on public.hourly_rates
  for select
  to anon, authenticated
  using (active);

create policy "Admins can read draft rates"
  on public.hourly_rates
  for select
  to authenticated
  using (public.is_portfolio_admin());

create policy "Admins can create rates"
  on public.hourly_rates
  for insert
  to authenticated
  with check (public.is_portfolio_admin());

create policy "Admins can update rates"
  on public.hourly_rates
  for update
  to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

create policy "Admins can delete rates"
  on public.hourly_rates
  for delete
  to authenticated
  using (public.is_portfolio_admin());

comment on table public.hourly_rates is
  'Hourly rates shown on /pricing, selected by the visitor country. Managed from /admin.';

-- ===== SEMENTE =====
-- Um ponto de partida com as três modalidades que o formulário de contato já
-- oferece, em dois mercados: Brasil e o padrão internacional.
--
-- ATENÇÃO: os valores abaixo são marcadores de posição, não uma sugestão de
-- preço. Todas as linhas nascem com active = false justamente por isso — nada
-- aparece em /pricing até você revisar os valores e ativar cada linha no /admin.

insert into public.hourly_rates (
  position, markets, currency, amount,
  title_pt, title_en, title_es,
  description_pt, description_en, description_es,
  featured
)
select * from (values
  (
    1, array['BR'], 'BRL', 150.00,
    'Desenvolvimento sob medida', 'Custom development', 'Desarrollo a medida',
    'Construção de sistemas, interfaces e integrações — do levantamento à entrega em produção.',
    'Building systems, interfaces, and integrations — from scoping to production delivery.',
    'Construcción de sistemas, interfaces e integraciones — del relevamiento a la entrega en producción.',
    true
  ),
  (
    2, array['BR'], 'BRL', 200.00,
    'Consultoria técnica', 'Technical consulting', 'Consultoría técnica',
    'Revisão de arquitetura, desempenho e decisões técnicas, com diagnóstico escrito ao final.',
    'Architecture, performance, and technical decision reviews, with a written diagnosis at the end.',
    'Revisión de arquitectura, rendimiento y decisiones técnicas, con un diagnóstico escrito al final.',
    false
  ),
  (
    3, array['BR'], 'BRL', 180.00,
    'Pesquisa e colaboração', 'Research and collaboration', 'Investigación y colaboración',
    'Apoio metodológico, análise de dados e escrita científica em projetos de pesquisa.',
    'Methodological support, data analysis, and scientific writing on research projects.',
    'Apoyo metodológico, análisis de datos y escritura científica en proyectos de investigación.',
    false
  ),
  (
    4, array['*'], 'USD', 45.00,
    'Desenvolvimento sob medida', 'Custom development', 'Desarrollo a medida',
    'Construção de sistemas, interfaces e integrações — do levantamento à entrega em produção.',
    'Building systems, interfaces, and integrations — from scoping to production delivery.',
    'Construcción de sistemas, interfaces e integraciones — del relevamiento a la entrega en producción.',
    true
  ),
  (
    5, array['*'], 'USD', 60.00,
    'Consultoria técnica', 'Technical consulting', 'Consultoría técnica',
    'Revisão de arquitetura, desempenho e decisões técnicas, com diagnóstico escrito ao final.',
    'Architecture, performance, and technical decision reviews, with a written diagnosis at the end.',
    'Revisión de arquitectura, rendimiento y decisiones técnicas, con un diagnóstico escrito al final.',
    false
  ),
  (
    6, array['*'], 'USD', 55.00,
    'Pesquisa e colaboração', 'Research and collaboration', 'Investigación y colaboración',
    'Apoio metodológico, análise de dados e escrita científica em projetos de pesquisa.',
    'Methodological support, data analysis, and scientific writing on research projects.',
    'Apoyo metodológico, análisis de datos y escritura científica en proyectos de investigación.',
    false
  )
) as seed(
  position, markets, currency, amount,
  title_pt, title_en, title_es,
  description_pt, description_en, description_es,
  featured
)
where not exists (select 1 from public.hourly_rates);

notify pgrst, 'reload schema';
