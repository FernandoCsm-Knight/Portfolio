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
   - `supabase/contact_requests.sql` — caixa de entrada do formulário de contato.
3. Copie `.env.example` para `.env.local` e preencha a URL e a chave pública.
4. Na Vercel, crie as mesmas variáveis em **Settings → Environment Variables**.
5. Faça um novo deploy para incorporar as variáveis `VITE_*` ao bundle.

Use somente a chave **Publishable** (ou a `anon` legada) no frontend. Nunca exponha
a chave `service_role`.

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
