# Ocean Portfolio

Portfólio React/Vite com cenas Three.js, avaliações públicas e um formulário de
demandas, ambos no Supabase e moderados em `/admin`.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor, execute **nesta ordem**:
   - `supabase/comments.sql` — avaliações e a tabela `comment_admins`;
   - `supabase/contact_requests.sql` — caixa de entrada do formulário de contato;
   - `supabase/projects.sql` — projetos exibidos em `/projects`;
   - `supabase/hourly_rates.sql` — tabela de valores de `/pricing`;
   - `supabase/lock_public_writes.sql` — **por último, e só depois do deploy
     das funções em `/api`** (ver "Proteção dos formulários" abaixo).
3. Copie `.env.example` para `.env.local` e preencha as variáveis.
4. Na Vercel, crie as mesmas variáveis em **Settings → Environment Variables**.
5. Faça um novo deploy para incorporar as variáveis `VITE_*` ao bundle.

Apenas as variáveis com prefixo `VITE_` são copiadas para dentro do bundle. É
essa fronteira que mantém os segredos fora do navegador, então o prefixo não é
cosmético: renomear `SUPABASE_SECRET_KEY` para `VITE_…` publicaria a chave para
qualquer visitante.

No frontend use a chave **Publishable** (`sb_publishable_…`). A **Secret key**
(`sb_secret_…`) — a geração que substituiu o JWT `service_role` — ignora a RLS e
vive só nas variáveis de servidor da Vercel.

## Proteção dos formulários

As avaliações e o formulário de contato são verificados com **reCAPTCHA
Enterprise**, e a verificação acontece no servidor.

O motivo de não ser no navegador: a chave `anon` do Supabase está no bundle por
natureza. Enquanto o papel `anon` tiver `INSERT`, um bot ignora a página e fala
direto com o PostgREST — e uma checagem feita no formulário não barra nada.
Então o envio passa por `/api/contact` e `/api/comment`, que conferem o token e
só então gravam com a `service_role`; `lock_public_writes.sql` revoga o `INSERT`
do `anon` e fecha o caminho direto.

1. No **Google Cloud → reCAPTCHA Enterprise**, crie uma chave do tipo *site web*
   (pontuação) e anote a chave de site.
2. Em **APIs e serviços → Credenciais**, crie uma **chave de API** com acesso à
   API do reCAPTCHA Enterprise.
3. Preencha `VITE_RECAPTCHA_SITE_KEY`, `RECAPTCHA_PROJECT_ID`,
   `RECAPTCHA_API_KEY` e `SUPABASE_SECRET_KEY` na Vercel.
4. Faça o deploy e confirme que os dois formulários enviam.
5. **Só então** rode `supabase/lock_public_writes.sql`.

As rotas falham fechadas: faltando qualquer variável, elas respondem `503` em
vez de aceitar o envio sem verificar. `RECAPTCHA_MIN_SCORE` ajusta a nota de
corte (padrão `0.5`).

### Autenticação do painel

O `/admin` usa e-mail e senha, e a autorização tem duas etapas: o Supabase Auth
diz quem você é, e uma linha em `comment_admins` diz se você pode moderar.

1. **Authentication → Sign In / Providers → Email**: mantenha o provedor
   habilitado e desligue `Allow new users to sign up` — o painel tem um dono só.
2. **Authentication → Users → Add user**: crie seu usuário e marque
   **Auto Confirm User** (sem isso o login falha com `Email not confirmed`).
3. No SQL Editor, autorize esse usuário a moderar:

   ```sql
   insert into public.comment_admins (user_id)
   select id from auth.users where email = 'SEU_EMAIL_AQUI'
   on conflict (user_id) do nothing;
   ```

Sem o passo 3 o login funciona, mas o painel responde "Acesso não autorizado".

Não é preciso configurar Redirect URLs: isso vale para magic link e OAuth, e o
painel usa senha.

## Moderação

`/admin` tem duas abas:

- **Avaliações** — aprova ou rejeita o que chega pelo carrossel da home. Só o que
  está em `approved` aparece publicamente.
- **Mensagens** — as demandas enviadas pelo formulário de `/contato`, com filas
  de novas, lidas e arquivadas. O contador na aba conta as não lidas e aparece
  também no título da janela.

As demandas nunca são públicas: o papel `anon` só tem permissão de `insert` na
tabela `contact_requests`, sem nenhuma policy de leitura.

O aviso de demanda nova em tempo real depende de a tabela estar publicada em
`supabase_realtime` — `supabase/contact_requests.sql` faz isso, e o painel cai
para uma consulta a cada 60s se a publicação não existir.

## Verificação

```bash
npm run lint
npm run build
```
