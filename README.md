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

   `supabase/contact_requests_encrypt.sql` e
   `supabase/contact_requests_drop_plaintext.sql` ficam de fora desta lista de
   propósito: eles têm ordem própria, com um backfill no meio, e estão descritos
   em "Criptografia da caixa de entrada".
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

## Criptografia da caixa de entrada

As demandas do formulário de contato não são gravadas em claro. `/api/contact`
valida e sela nome, e-mail, empresa e mensagem num único `payload_enc`, com
**ECDH P-256 → HKDF-SHA256 → AES-256-GCM** (`shared/contactSeal.js`, só
WebCrypto — nenhuma dependência nova).

O que isso cobre, e o que não: o Supabase já cifra disco e trânsito, então o
cenário "roubaram o datacenter" não era o problema. O que sobra é dump de
backup, `SUPABASE_SECRET_KEY` vazada, sessão de admin comprometida e o próprio
dashboard — e nesses casos o que decide é **onde está a chave que abre**. Ela
não está no banco nem na Vercel: o servidor só tem a pública, e a privada existe
apenas no navegador do `/admin`, atrás de uma senha. Vazar a env inteira junto
com a base não abre nenhuma mensagem.

RSA não serviria aqui sozinho: com RSA-OAEP de 2048 bits cabem ~190 bytes, e
`message` vai a 2000 caracteres — todo uso real seria híbrido de qualquer forma.

Em claro continuam `subject`, `status`, `created_at` e `read_at`, para o painel
filtrar e ordenar sem decifrar a caixa inteira. Em troca, não há busca por
conteúdo no banco, e o dashboard do Supabase deixa de ser um caminho para ler
uma demanda.

### Instalar

```bash
node scripts/gerar-chave-contato.mjs        # gera o par, pede a senha
```

1. Guarde **`chave-contato.json` e a senha** no gerenciador de senhas. Perder
   qualquer um dos dois torna a caixa ilegível para sempre, inclusive para você
   — não há recuperação, e é esse justamente o ponto do desenho.
2. `CONTACT_PUBLIC_KEY` na Vercel e no `.env.local`.
3. `supabase/contact_requests_encrypt.sql` no SQL Editor — **antes do deploy**.
   Ele é compatível para trás, então o código que está no ar continua gravando;
   na ordem inversa, o código novo pediria uma coluna inexistente e todo envio
   responderia 500 até o SQL rodar.
4. Deploy. A partir daqui nenhuma demanda nova nasce em claro.
5. `node --env-file=.env.local scripts/migrar-mensagens.mjs` — sela as demandas
   que já existiam e zera as colunas em claro. Depois do deploy, e não antes:
   com o código antigo no ar, uma demanda que chegasse durante a varredura
   ficaria para trás.
6. Em `/admin` → Mensagens, cole o conteúdo de `chave-contato.json`, digite a
   senha e **confirme que as mensagens antigas abrem**.
7. Só então `supabase/contact_requests_drop_plaintext.sql`, que derruba as
   colunas em claro. O passo 6 é o único teste de que a chave guardada é mesmo a
   que fecha o que está gravado — depois do 7 não há cópia para conferir.

A rota falha fechada: sem `CONTACT_PUBLIC_KEY` ela responde `503` em vez de
gravar em claro.

### No dia a dia

A senha é pedida uma vez por sessão do painel: o arquivo fica no `localStorage`
do navegador (fechado, sozinho não abre nada) e a chave destravada vive só em
memória — recarregar a página tranca de novo. `Trancar` faz isso na hora, e
`Remover a chave deste navegador` apaga o arquivo guardado, sem tocar no banco.

Trocar o par de chaves invalida o que já está gravado: as demandas antigas
continuam abrindo apenas com a chave antiga. Guarde as duas, ou migre antes.

## Moderação

`/admin` tem duas abas:

- **Avaliações** — aprova ou rejeita o que chega pelo carrossel da home. Só o que
  está em `approved` aparece publicamente.
- **Mensagens** — as demandas enviadas pelo formulário de `/contato`, com filas
  de novas, lidas e arquivadas. O contador na aba conta as não lidas e aparece
  também no título da janela.

As demandas nunca são públicas: o papel `anon` não tem policy de leitura na
tabela `contact_requests`, e o conteúdo está cifrado por cima disso — ver
"Criptografia da caixa de entrada". Com a chave trancada o painel ainda lista,
filtra e arquiva pelo assunto e pela data; só o texto fica ilegível.

O aviso de demanda nova em tempo real depende de a tabela estar publicada em
`supabase_realtime` — `supabase/contact_requests.sql` faz isso, e o painel cai
para uma consulta a cada 60s se a publicação não existir.

## Verificação

```bash
npm run lint
npm run build
```
