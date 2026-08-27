# Basquete UTFPR

Painel do técnico para as equipes de basquete feminina e masculina da UTFPR: atletas, notas de
evolução, treinos, competições, escalação e jogadas táticas — com login institucional (Google) e
acesso diferenciado para técnico e atletas.

## O que já vem pronto

- Login com Google restrito ao domínio institucional (`ALLOWED_EMAIL_DOMAINS`).
- Dois papéis: **técnico** (admin, edita tudo) e **atleta** (lê treinos, jogadas, competições e a
  própria ficha/escalação).
- Banco de dados Postgres — funciona com Vercel Postgres, Neon, Supabase ou qualquer Postgres.
- Campo de link de vídeo (YouTube/Vimeo) em treinos e jogadas, prontos para quando vocês
  começarem a gravar conteúdo.
- Visual preto e amarelo, com um emblema provisório em `public/logo-utfpr.svg`.

> **Sobre a logo:** não consegui baixar o arquivo oficial da UTFPR a partir deste ambiente (sem
> acesso à internet aberta aqui). Coloquei um emblema provisório no mesmo estilo. Para usar a logo
> oficial, é só substituir o arquivo `public/logo-utfpr.svg` pelo arquivo de vocês (pode ser
> `.svg` ou `.png` — nesse caso, ajuste a referência em `src/components/Sidebar.js` e
> `src/app/login/page.js`).

## 1. Colocar o código no seu GitHub

```bash
cd basquete-app
git remote add origin https://github.com/SEU-USUARIO/basquete-utfpr.git
git branch -M main
git push -u origin main
```

(Crie o repositório vazio no GitHub antes, em github.com/new — sem README, sem .gitignore, para
não conflitar com o que já vem pronto aqui.)

## 2. Importar na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório que você acabou de criar.
2. Antes de clicar em "Deploy", abra a aba **Storage** do projeto (ou faça isso depois do primeiro
   deploy) e crie um banco **Postgres** (Neon, oferecido direto pela Vercel) — isso já injeta a
   variável `DATABASE_URL`/`POSTGRES_URL` automaticamente no projeto.
3. Em **Settings → Environment Variables**, adicione:
   - `AUTH_SECRET` — gere com `npx auth secret` (rodando localmente) ou `openssl rand -base64 33`.
   - `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` — veja o passo 3 abaixo.
   - `ALLOWED_EMAIL_DOMAINS` — ex: `alunos.utfpr.edu.br,utfpr.edu.br`.
4. Clique em **Deploy**.

## 3. Criar as credenciais do Google (login institucional)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/), crie um projeto (ou use
   um existente) e vá em **APIs e Serviços → Tela de consentimento OAuth**. Configure como
   "Externo", com o nome "Basquete UTFPR".
2. Em **Credenciais → Criar credenciais → ID do cliente OAuth**, tipo "Aplicativo da Web".
3. Em **URIs de redirecionamento autorizados**, adicione:
   `https://SEU-PROJETO.vercel.app/api/auth/callback/google`
   (troque pelo domínio real depois do primeiro deploy na Vercel).
4. Copie o **Client ID** e o **Client secret** para as variáveis `GOOGLE_CLIENT_ID` e
   `GOOGLE_CLIENT_SECRET` na Vercel.
5. Se a TI da UTFPR restringir quais aplicativos de terceiros os alunos podem autorizar, peça para
   liberarem esse Client ID — veja a explicação no chat sobre isso.

## 4. Criar as tabelas e a sua conta de técnico

Depois do primeiro deploy (com o banco já conectado), rode o script de seed **uma vez**, com as
variáveis do banco de produção:

```bash
npm install
DATABASE_URL="cole aqui a DATABASE_URL da Vercel" \
COACH_EMAIL="seu-email@utfpr.edu.br" \
COACH_NAME="Seu nome" \
node scripts/seed.js
```

(A `DATABASE_URL` de produção fica em **Storage → seu banco → .env.local** na Vercel, ou em
**Settings → Environment Variables**.)

Isso cria as tabelas, já popula as 3 competições (Engenhariadas, JUPS, JOIA) com o histórico que
você me passou, e garante que o seu e-mail vire a conta de técnico (admin).

## 5. Cadastrar os atletas

Depois de logado como técnico, vá em **Atletas → Adicionar atleta** e cadastre cada um com o
e-mail institucional. É esse e-mail que a atleta usa para entrar com "Login com Google" — não
precisa de senha nenhuma.

## Rodando localmente (opcional)

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
node scripts/seed.js
npm run dev
```

## Estrutura

```
src/app/            páginas (App Router)
src/app/actions.js  todas as ações de escrita (server actions)
src/auth.js          configuração completa do login (Google + Postgres)
src/auth.config.js   configuração "leve" usada pelo proxy (middleware)
src/lib/db.js        conexão com o Postgres
db/schema.sql         esquema das tabelas + dados iniciais das competições
scripts/seed.js       aplica o schema e garante a conta do técnico
```
