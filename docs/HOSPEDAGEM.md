# Hospedagem de demonstração — Vercel + Aiven

**Endereço:** https://plataforma-enahub.vercel.app

Versão online do ENAHub para a equipe e o professor testarem em qualquer dispositivo, sem instalar nada.
Custo zero: **Vercel Hobby** (front-end React e API Express) + **Aiven for MySQL Free** (banco). Nenhum cartão foi cadastrado.

> Branch publicada: **`deploy/vercel-aiven`** (derivada de `feat/enahub-mvp-03nov`). A `main` não é usada.
> A execução local continua igual (veja `docs/INSTALACAO.md`).

## 1. Arquitetura online

```
 Navegador ──HTTPS──► Vercel (plataforma-enahub.vercel.app)
                       ├─ /assets, /index.html ......... arquivos estáticos do React (CDN)
                       ├─ /qualquer-tela .............. index.html (React Router)
                       └─ /api/* ...................... Vercel Function (Express do backend/, região sfo1)
                                                              │ TLS 1.3, certificado validado pelo CA do Aiven
                                                              ▼
                                                  Aiven for MySQL Free 8.4 (DigitalOcean, Califórnia)
                                                  banco enahub_demo · usuário enahub_api
```

- Front-end e API no **mesmo endereço**: não há CORS nem URL de API separada.
- `api/index.js` só reexporta `backend/src/app.js`: rotas, autenticação e regras de negócio são as mesmas da versão local.
- Região da função **sfo1** (São Francisco), a mais próxima do banco, para reduzir a latência entre API e MySQL.
- O navegador nunca acessa o MySQL; só a função conecta.

### O que muda em relação ao servidor local (e por quê)

| Local (`npm start`) | Online (Vercel Functions) |
|---|---|
| Rotina a cada 30 s finaliza simulados vencidos | Não há processo permanente: os vencidos são finalizados **quando o aluno ou o admin consulta** (iniciar, abrir, salvar, histórico, desempenho, relatórios). O prazo continua no banco (`data_limite`), então o F5 e uma nova instância não alteram o tempo |
| Limite de tentativas de login em memória | Contador na tabela `limites_tentativas` (migration 004), compartilhado entre instâncias; guarda só um hash de IP + rota + e-mail |
| Pool de até 10 conexões | Até 3 conexões por instância, fechadas após 5 s ociosas (`attachDatabasePool`), `wait_timeout` de 120 s. O Aiven Free permite 76 conexões |
| Datas no fuso do computador | `DB_TIMEZONE=Z`: Vercel e Aiven em UTC |
| Cadastro livre | Cadastro exige o **código de convite** (`CODIGO_CONVITE`) |
| Link de recuperação pode aparecer na tela (opcional) | **Nunca** aparece na resposta; fica só nos logs da Vercel (visíveis só para quem administra o projeto na Vercel, retidos por 1 hora) |

## 2. Controle de acesso

- **Vercel Authentication** no plano Hobby protege só as URLs de pré-visualização. O domínio de produção fica público, e cada pessoa precisaria entrar na equipe Vercel (plano pago). Por isso **não** foi usada para controlar o acesso dos colegas.
- O controle é **no próprio aplicativo**:
  - toda tela exige login (sem login, só aparecem login, cadastro, recuperação e termos);
  - o **cadastro exige o código de convite**, enviado pelo responsável pelo projeto (cauammedeiros) só para a equipe e o professor;
  - novas contas são sempre **aluno**; professor/admin são promovidos em Administração → Usuários;
  - as contas `@enahub.demo` online usam uma **senha forte e privada**, diferente da senha pública local `Enahub@2026`.
- O código de convite e a senha das contas online estão **somente** em `~/enahub_hospedagem/hospedagem.env` no computador do responsável pelo projeto (permissão 600, fora do Git) e nas variáveis secretas da Vercel.
- Outras proteções: HTTPS com HSTS, cabeçalhos `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Cache-Control: no-store` na API, limite de tentativas no login e uma regra do **Firewall da Vercel**: até 600 requisições/min em `/api` por IP. O valor é alto de propósito, porque uma sala inteira no mesmo Wi-Fi compartilha o IP.

## 3. Banco no Aiven

- Serviço `enahub-mysql`, plano **Free** (1 CPU, 1 GB RAM, 1 GB de disco, `max_connections` = 76), **MySQL 8.4.11**.
- Banco exclusivo **`enahub_demo`**, separado do MySQL local. Contém só os dados de demonstração (32 questões demonstrativas, **não oficiais**).
- Dois usuários:
  - `avnadmin` (administrador): usado **só no computador do responsável pelo projeto**, para migrations e seed (`backend/scripts/preparar-hospedagem.js`);
  - `enahub_api` (usado pela Vercel): `SELECT, INSERT, UPDATE, DELETE` apenas em `enahub_demo`, **TLS obrigatório** (`REQUIRE SSL`). Não cria nem apaga tabelas.
- A API só conecta com TLS **validando o certificado CA** (`rejectUnauthorized: true`). Conexões sem TLS ou sem o CA correto são recusadas (testado).

### Preparar ou atualizar o banco (responsável pelo projeto)

```bash
cd backend
ENAHUB_ENV_FILE=~/enahub_hospedagem/hospedagem.env node scripts/preparar-hospedagem.js
```
O script recusa o MySQL local, exige TLS, aplica só as migrations pendentes, insere os dados de demonstração que faltam e ajusta o usuário da API. **Nada é apagado.** Faça antes um backup:
```bash
mysqldump --ssl-mode=VERIFY_IDENTITY --ssl-ca=~/enahub_hospedagem/ca.pem -h <host> -P <porta> -u avnadmin -p \
  --no-tablespaces --single-transaction --set-gtid-purged=OFF enahub_demo > backup_enahub_demo.sql
```

## 4. Vercel

- Projeto **`plataforma-enahub`** na conta pessoal (Hobby). Configuração em `vercel.json` (instalação, build do Vite, saída `frontend/dist`, rewrites, região, cabeçalhos). `.vercelignore` impede o envio de `.env`, certificados, testes e documentação.
- Variáveis de ambiente (Production), cadastradas **só no painel/CLI da Vercel**. Os nomes estão abaixo; os valores não ficam no Git:

| Variável | Tipo | Conteúdo |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | Secret | conexão do usuário `enahub_api` |
| `DB_NAME` | Config | `enahub_demo` |
| `DB_SSL_CA` | Config | certificado CA **público** do Aiven (PEM) |
| `DB_TIMEZONE` | Config | `Z` |
| `NODE_ENV` | Config | `production` |
| `FRONTEND_URL` | Config | `https://plataforma-enahub.vercel.app` |
| `CODIGO_CONVITE` | Secret | código de convite do cadastro |
| `VITE_CADASTRO_COM_CONVITE` | Config | `true` (mostra o campo no formulário) |
| `RECUPERACAO_LINK_NA_RESPOSTA` | Config | `false` |

- **Publicação por CLI**, sem ligação automática ao GitHub. Assim, nenhum push em outra branch (inclusive `main` ou `feat/enahub-mvp-03nov`) altera o site. Para publicar uma nova versão:
  ```bash
  git switch deploy/vercel-aiven && git pull
  vercel deploy --prod
  ```
- Logs: `vercel logs` (Hobby guarda apenas 1 hora). Firewall: `vercel firewall status`.

## 5. Como compartilhar com a equipe e o professor

Envie em particular (WhatsApp/e-mail do grupo, **não** em repositório ou rede pública):

> **ENAHub online:** https://plataforma-enahub.vercel.app
> 1. Clique em **Criar conta**, preencha seus dados e o **código de convite**: `<código>`.
> 2. Toda conta nova é de aluno. Para ver as telas de professor ou admin, peça ao responsável pelo projeto para promover sua conta.
> As questões são demonstrativas (não oficiais do ENADE). Não use dados pessoais sensíveis.

Para o professor avaliar os três perfis, o responsável pelo projeto pode promover a conta dele a admin em Administração → Usuários, ou passar em particular a senha de `admin@enahub.demo` online.

## 6. Limitações dos planos gratuitos

**Aiven Free**
- 1 CPU, 1 GB RAM, 1 GB de disco, 76 conexões, um nó só (sem alta disponibilidade), sem SLA nem suporte.
- **O serviço é desligado se ficar sem uso por um tempo.** A Aiven avisa por e-mail antes. Para religar: console.aiven.io → serviço `enahub-mysql` → **Power on** (os dados ficam guardados). **Abra o site e faça login 1–2 dias antes da apresentação** para confirmar que está ligado.
- A Aiven pode mudar provedor, região ou configuração do plano gratuito.

**Vercel Hobby**
- Uso pessoal/não comercial; função em **uma região**; até 300 s por requisição; 1 regra de rate limit no firewall; logs por 1 hora.
- Proteção por senha e proteção do domínio de produção exigem planos pagos (não usados).
- Cotas mensais gratuitas de requisições/CPU/banda, folgadas para uma demonstração. Sem cartão, não há cobrança: ao esgotar uma cota, o serviço é limitado até o mês seguinte.

**Desempenho medido (26/10/2026, a partir do computador do responsável, no Brasil):** mediana de 120 a 240 ms por chamada da API. Não foi feito teste de carga (RNF002 continua não verificado).

## 7. Como interromper ou excluir

| Ação | Vercel | Aiven |
|---|---|---|
| Interromper temporariamente | (opcional) remover as variáveis `DB_*` em Settings → Environment Variables e publicar de novo | Console → `enahub-mysql` → **Power off**: o site abre, mas login e dados ficam indisponíveis; os dados são preservados |
| Excluir de vez | `vercel project rm plataforma-enahub` ou Settings → Advanced → **Delete Project** | Console → `enahub-mysql` → **Delete service** (**apaga os dados**; faça um `mysqldump` antes) |
| Sair da CLI neste computador | `vercel logout` | — |

Depois de excluir, apague também `~/enahub_hospedagem/` (contém a senha de administrador do banco).

## 8. Testes executados no ambiente hospedado (26/10/2026)

Resumo; detalhes em `docs/TESTES.md`, seção 3.1.
- Roteiro E2E `jornada` (aluno) e `gestao` (professor/admin) **contra o site publicado**: todas as verificações OK, nenhum erro de JavaScript nem HTTP 5xx.
- Simulado em andamento preservado após **nova implantação** (todas as instâncias substituídas): 2 respostas mantidas e tempo restante coerente (1799 s → 1760 s após 39 s).
- Limite de login online: 10 falhas → 11ª tentativa com HTTP 429.
- Cadastro sem código ou com código errado: recusado (400).
- Senha pública `Enahub@2026` não funciona online; as contas online entram com a senha privada.
- Recuperação de senha não devolve link na resposta.
- Rotas: telas do React por URL direta (200), `/api/rota-inexistente` (404 JSON), `/assets/inexistente` (404).
- Usuário `enahub_api`: DDL e tabelas do sistema bloqueados; conexão sem TLS recusada.
- Pico de 7 conexões simultâneas no MySQL durante os testes (limite: 76).
- Após os testes, o banco `enahub_demo` foi restaurado ao estado da demonstração (backup antes e depois em `~/enahub_backups/`).
