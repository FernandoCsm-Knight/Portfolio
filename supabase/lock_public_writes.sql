-- Fecha o caminho direto do navegador para as duas tabelas que o público
-- escreve. A partir daqui elas só recebem linhas pelas funções em /api, que
-- verificam o reCAPTCHA antes de gravar com a service role key.
--
-- POR QUE: a chave anon do Supabase está no bundle JavaScript, por natureza.
-- Enquanto `anon` tiver INSERT, um bot ignora a página inteira e fala direto
-- com o PostgREST — e aí a verificação do token no formulário não barra nada.
--
-- ORDEM IMPORTA: publique /api/contact e /api/comment (com as variáveis de
-- ambiente configuradas na Vercel) ANTES de rodar este arquivo. No intervalo
-- entre uma coisa e outra, os formulários ficam sem caminho de escrita.
--
-- PARA VOLTAR ATRÁS, se algo der errado no deploy:
--   grant insert (name, message, rating) on public.comments to anon, authenticated;
--   grant insert (name, email, company, subject, message) on public.contact_requests to anon, authenticated;

do $$
begin
  if to_regclass('public.comments') is null
     or to_regclass('public.contact_requests') is null then
    raise exception
      'Rode supabase/comments.sql e supabase/contact_requests.sql antes deste arquivo.';
  end if;
end
$$;

revoke insert on table public.comments from anon, authenticated;
revoke insert on table public.contact_requests from anon, authenticated;

-- As policies de INSERT continuam declaradas nos arquivos originais e não são
-- removidas aqui. Sem o grant elas nunca são alcançadas, e a service role passa
-- por cima da RLS de qualquer forma — mantê-las deixa o histórico legível e faz
-- a volta atrás caber num único `grant`.
--
-- O que continua valendo para as linhas que a service role insere são os CHECK
-- da própria tabela: tamanho de nome/mensagem, faixa da nota, formato do e-mail
-- e o enum de assunto. Eles estão no DDL, não nas policies, então este arquivo
-- não afrouxa nenhuma validação. `moderation_status` também segue com
-- `default 'pending'`, e as rotas em /api não enviam essa coluna — avaliação
-- nova continua nascendo para moderar.

notify pgrst, 'reload schema';
