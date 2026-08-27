create extension if not exists pgcrypto;

/* Reaproveita a mesma tabela de administradores e a função
   is_portfolio_admin() usadas pelas avaliações (supabase/comments.sql) — é o
   único "dono" do portfólio, não faz sentido duplicar o conceito de admin
   por área. */
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

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0,
  title_pt text not null check (char_length(btrim(title_pt)) between 2 and 80),
  title_en text not null check (char_length(btrim(title_en)) between 2 and 80),
  title_es text not null check (char_length(btrim(title_es)) between 2 and 80),
  description_pt text not null check (char_length(btrim(description_pt)) between 10 and 600),
  description_en text not null check (char_length(btrim(description_en)) between 10 and 600),
  description_es text not null check (char_length(btrim(description_es)) between 10 and 600),
  tags text[] not null default '{}',
  href text not null check (href ~ '^https?://'),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_position_idx on public.projects (position);

/* Preenche a posição automaticamente quando a linha não informa uma — evita
   que o painel precise calcular "próxima posição livre" antes de cada
   inserção. */
create or replace function public.set_project_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.position is null or new.position = 0 then
    select coalesce(max(position), 0) + 1 into new.position from public.projects;
  end if;
  return new;
end;
$$;

revoke all on function public.set_project_position() from public, anon, authenticated;

drop trigger if exists set_project_position on public.projects;
create trigger set_project_position
before insert on public.projects
for each row execute function public.set_project_position();

create or replace function public.set_project_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_project_updated_at() from public, anon, authenticated;

drop trigger if exists set_project_updated_at on public.projects;
create trigger set_project_updated_at
before update on public.projects
for each row execute function public.set_project_updated_at();

alter table public.projects enable row level security;

revoke all on table public.projects from anon, authenticated;

grant select on table public.projects to anon, authenticated;
grant insert (
  title_pt, title_en, title_es,
  description_pt, description_en, description_es,
  tags, href, image_path, position
) on table public.projects to authenticated;
grant update (
  title_pt, title_en, title_es,
  description_pt, description_en, description_es,
  tags, href, image_path, position
) on table public.projects to authenticated;
grant delete on table public.projects to authenticated;

drop policy if exists "Projects are public" on public.projects;
drop policy if exists "Admins can create projects" on public.projects;
drop policy if exists "Admins can update projects" on public.projects;
drop policy if exists "Admins can delete projects" on public.projects;

create policy "Projects are public"
  on public.projects
  for select
  to anon, authenticated
  using (true);

create policy "Admins can create projects"
  on public.projects
  for insert
  to authenticated
  with check (public.is_portfolio_admin());

create policy "Admins can update projects"
  on public.projects
  for update
  to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

create policy "Admins can delete projects"
  on public.projects
  for delete
  to authenticated
  using (public.is_portfolio_admin());

comment on table public.projects is
  'Projects shown in the /projects carousel. Fully managed from the admin panel.';

-- ===== BUCKET DE IMAGENS DE CAPA =====

insert into storage.buckets (id, name, public)
values ('project-covers', 'project-covers', true)
on conflict (id) do nothing;

drop policy if exists "Project covers are publicly readable" on storage.objects;
drop policy if exists "Admins can upload project covers" on storage.objects;
drop policy if exists "Admins can update project covers" on storage.objects;
drop policy if exists "Admins can delete project covers" on storage.objects;

create policy "Project covers are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'project-covers');

create policy "Admins can upload project covers"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'project-covers' and public.is_portfolio_admin());

create policy "Admins can update project covers"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'project-covers' and public.is_portfolio_admin())
  with check (bucket_id = 'project-covers' and public.is_portfolio_admin());

create policy "Admins can delete project covers"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'project-covers' and public.is_portfolio_admin());

-- ===== SEED: os 4 projetos que hoje estão fixos em src/data/projects.js =====
-- Roda só na primeira vez (a tabela nasce vazia); depois disso, tudo passa a
-- ser gerenciado pelo painel /admin.

insert into public.projects (
  position, title_pt, title_en, title_es,
  description_pt, description_en, description_es,
  tags, href
)
select * from (values
  (
    1,
    'Pineapple', 'Pineapple', 'Pineapple',
    'Framework de aprendizado profundo escrito do zero em C++, inspirado em PyTorch e TensorFlow: diferenciação automática, operações com tensores e uma API modular de camadas. Executa em paralelo na CPU (multithreading) e na GPU (CUDA), com ganhos expressivos sobre implementações ingênuas.',
    'A deep-learning framework written from scratch in C++, with automatic differentiation, tensors, modular layers, and parallel CPU/GPU execution with CUDA.',
    'Framework de aprendizaje profundo escrito desde cero en C++, con diferenciación automática, tensores, capas modulares y ejecución paralela en CPU/GPU con CUDA.',
    array['C++', 'CUDA', 'APRENDIZADO PROFUNDO'],
    'https://github.com/FernandoCsm-Knight/Pineapple'
  ),
  (
    2,
    'Graphic Paint', 'Graphic Paint', 'Graphic Paint',
    'Editor visual de grafos e autômatos em TypeScript, na linha do Excalidraw. Constrói grafos dirigidos e não dirigidos e autômatos finitos (AFD, AFN, ε-AFN e com pilha), simula entradas e roda algoritmos — BFS, DFS, caminho mínimo, árvore geradora mínima — direto na tela de desenho.',
    'A TypeScript visual editor for graphs and automata, with input simulation and interactive algorithms directly on the canvas.',
    'Editor visual de grafos y autómatas en TypeScript, con simulación de entradas y algoritmos interactivos directamente en el lienzo.',
    array['TYPESCRIPT', 'REACT', 'ALGORITMOS'],
    'https://graphic-paint-roan.vercel.app/paint'
  ),
  (
    3,
    'Classificação Estelar', 'Stellar Classification', 'Clasificación Estelar',
    'Classificadores clássicos e modernos — Random Forest, SVM e redes neurais — aplicados a conjuntos de dados astronômicos para separar estrelas, galáxias e quasares, comparados por validação cruzada, curvas ROC/AUC e testes estatísticos.',
    'Machine-learning models applied to astronomical data to classify stars, galaxies, and quasars.',
    'Modelos de aprendizaje automático aplicados a datos astronómicos para clasificar estrellas, galaxias y cuásares.',
    array['PYTHON', 'SCIKIT-LEARN', 'MACHINE LEARNING'],
    'https://github.com/FernandoCsm-Knight/Stellar-Classification'
  ),
  (
    4,
    'Tecnologia Persuasiva para Rotinas com TDAH', 'ADHD Research', 'Investigación sobre TDAH',
    'Pesquisa de iniciação científica (CNPq, laboratório LICAP da PUC Minas) sobre gestão da rotina de famílias com crianças e adolescentes com TDAH, numa abordagem centrada no usuário. Publicada no IHC 2024 (ACM) com Menção Honrosa, e ampliada em artigo no Journal of the Brazilian Computer Society.',
    'User-centered research on persuasive technology supporting the routines of families of children and adolescents with ADHD.',
    'Investigación centrada en el usuario sobre tecnología persuasiva para apoyar las rutinas de familias de niños y adolescentes con TDAH.',
    array['PESQUISA', 'IHC', 'ACM'],
    'https://dl.acm.org/doi/10.1145/3702038.3702101'
  )
) as seed(position, title_pt, title_en, title_es, description_pt, description_en, description_es, tags, href)
where not exists (select 1 from public.projects);

notify pgrst, 'reload schema';
