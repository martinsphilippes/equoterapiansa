# Equoterapia · Gestão

Aplicativo web progressivo (PWA) para gestão da operação de uma empresa de equoterapia: equipe, jornada e pagamentos; praticantes, responsáveis, agenda e atendimentos; avaliações, evolução e relatórios; área da família; painel da direção e auditoria.

Stack: **Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Firebase (Auth + Firestore, plano gratuito Spark) · Vercel**.

## Como funciona (arquitetura em 1 minuto)

- **O navegador nunca acessa o Firestore diretamente.** Todas as leituras e escritas passam pelo servidor (Firebase Admin SDK dentro do Next.js), onde as permissões por perfil e por praticante são aplicadas em um único lugar (`src/lib/auth/session.ts` + `src/lib/auth/permissions.ts`). As regras do Firestore negam tudo (`firestore.rules`).
- **Login**: Firebase Auth (e-mail/senha) no navegador apenas para obter o token; o servidor troca o token por um **cookie de sessão httpOnly** (`/api/auth/session`). O perfil e as permissões ficam em `users/{uid}`.
- **Arquivos (documentos e fotos)** ficam no próprio Firestore, em blocos de 700 KB (`files` + `fileChunks`), sem Firebase Storage (que exige o plano pago Blaze). Limite de 4 MB por arquivo; fotos são otimizadas no navegador antes do envio. Downloads passam por `/api/files/{id}`, que verifica a permissão. Cota gratuita: 1 GiB, suficiente para milhares de documentos digitalizados.
- **Auditoria**: toda ação importante grava um registro em `auditLogs` no mesmo lote (batch) da alteração.
- **Datas** são armazenadas como `AAAA-MM-DD` e horários como `HH:mm` no fuso da instituição (configurável), evitando problemas de fuso no servidor.

Perfis: Dono (tudo), Gerente (permissões ajustáveis pelo Dono), Profissional de atendimento (só seus praticantes), Colaborador (jornada e agenda) e Responsável (área da família, só seus praticantes).

## Rodando localmente com emuladores (sem projeto Firebase)

```bash
npm install
npm run emulators          # terminal 1: Auth + Firestore (precisa de Java 21+)
npm run dev:emulators      # terminal 2: copia .env.emulator para .env.local e sobe o Next
```

Abra http://localhost:3000 → a tela **Configuração inicial** cria o primeiro Dono (segredo local: `setup-local`).

Testes de fumaça ponta a ponta (com os dois terminais acima rodando):

```bash
npm run e2e
```

## Colocando em produção (Firebase + Vercel + GitHub)

### 1. Firebase

1. Crie um projeto em https://console.firebase.google.com.
2. **Authentication → Sign-in method**: ative *E-mail/senha*.
3. **Firestore Database**: crie o banco (modo produção). Não é necessário ativar o Storage.
4. Publique regras e índices (instale o CLI com `npm i -g firebase-tools`, depois `firebase login`):
   ```bash
   firebase use SEU_PROJETO
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   Ou cole `firestore.rules` em *Firestore → Regras* e crie os 4 índices de `firestore.indexes.json` em *Firestore → Índices*.
5. **Configurações do projeto → Contas de serviço → Gerar nova chave privada**. Converta para base64:
   ```bash
   base64 -w0 service-account.json      # macOS: base64 -i service-account.json
   ```
6. **Configurações do projeto → Geral → Seus apps → Web**: registre um app e copie `apiKey`, `authDomain`, `projectId`, `appId`.
7. Em **Authentication → Settings → Domínios autorizados**, adicione o domínio da Vercel (ex.: `seu-app.vercel.app`).

### 2. Vercel

1. Importe o repositório do GitHub em https://vercel.com/new (framework: Next.js, sem ajustes).
2. Em **Settings → Environment Variables**, cadastre (veja `.env.example`):

   | Variável | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | do app Web |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `seu-projeto.firebaseapp.com` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `seu-projeto` |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | do app Web |
   | `FIREBASE_SERVICE_ACCOUNT_BASE64` | a chave em base64 (secreta) |
   | `SETUP_SECRET` | um segredo forte, usado só na configuração inicial |

3. Faça o deploy. Abra `https://seu-app.vercel.app/configuracao-inicial`, crie o Dono usando o `SETUP_SECRET` e entre.
4. Instale no celular: no navegador, *Adicionar à tela inicial*.

### 3. GitHub

O workflow em `.github/workflows/ci.yml` roda lint, typecheck e build a cada push. A Vercel faz o deploy automático da branch principal e cria *previews* para pull requests.

## Estrutura

```
src/app/(auth)        login e configuração inicial
src/app/(app)         área da equipe (painel, agenda, praticantes, jornada, equipe, pagamentos, comunicados, auditoria, configurações)
src/app/(family)      área da família (responsáveis)
src/app/api           sessão, token de upload, entrega de arquivos, setup
src/lib/auth          sessão e matriz de permissões
src/lib/actions       server actions (regras de negócio + auditoria)
src/lib/db            tipos, coleções, consultas, configurações padrão
src/lib/domain        cálculos puros: horas, folha, avaliações, frequência, datas
src/lib/files         armazenamento de arquivos em blocos no Firestore
src/components        interface (mobile-first)
e2e/                  testes de fumaça com Playwright contra os emuladores
```

## Coleções do Firestore

`users`, `settings/general`, `jobRoles`, `collaborators`, `documentTypes`, `documents`, `files` + `fileChunks` (conteúdo dos arquivos), `timeEntries` (`{colaborador}_{data}`), `payrollMonths` (`{colaborador}_{AAAA-MM}`), `practitioners`, `guardians`, `appointments`, `sessions`, `assessmentCategories`, `assessments`, `reports`, `announcements`, `practitionerEvents`, `auditLogs`.

## Regras de negócio que merecem destaque

- **Horas**: soma dos períodos (entrada→saída) menos intervalo. Atraso = primeira entrada após o início da jornada (acima da tolerância). Faltas = dias úteis passados sem registro ou marcados como falta. Jornada padrão configurável; cada colaborador pode ter jornada própria.
- **Pagamentos**: o sistema calcula valor base (salário ou horas × valor/hora), valor/hora de referência e uma simulação proporcional; ajustes manuais somam ao valor calculado. Marcar como **PAGO** congela os números no histórico. Nenhuma decisão trabalhista é automática.
- **Frequência** = realizadas ÷ (realizadas + faltas). Cancelamentos e reagendamentos não penalizam o praticante.
- **Evolução** = comparação das médias por área entre a avaliação inicial e a mais recente; a porcentagem é relativa à média inicial. Cada avaliação guarda a escala e as categorias usadas na época (histórico estável mesmo se a configuração mudar).
- **Encerramento** registra data, motivo, avaliação final, responsável pela decisão e gera o relatório final; cancela agendamentos futuros. O sistema não decide alta.
