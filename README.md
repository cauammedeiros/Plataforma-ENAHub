# Plataforma ENAHub

**Sistema web de preparação para o ENADE** · Ciência da Computação · UNIFOR

> ✅ **Versão completa do MVP: branch `feat/enahub-mvp-03nov`** (branch padrão deste repositório).
> A `main` contém apenas a estrutura inicial do projeto. Confira com `git branch --show-current`.

Projeto acadêmico da disciplina **Desenvolvimento de Plataformas Web** do curso de Ciência da Computação da UNIFOR.

Equipe: Marco Cauã (back-end) · Pedro Pompeu (front-end) · João Victor (UI/UX) · Cauã Melo (gerência)

Repositório original da equipe: [MarcoMarola/ENAHub](https://github.com/MarcoMarola/ENAHub)

O ENAHub reúne em uma única plataforma o banco de questões, os simulados cronometrados com correção automática, o gabarito comentado, o acompanhamento de desempenho, o fórum e as ferramentas administrativas. **Roda localmente**: não há hospedagem na internet.

| Camada | Tecnologias |
|---|---|
| Front-end | React 19, React Router 7, Bootstrap 5, Vite |
| Back-end | Node.js, Express 5, mysql2 |
| Banco de dados | MySQL **8.0.19 ou superior** (testado em 8.0.46 e 9.3). **MariaDB/XAMPP não é suportado** |
| Testes | `node:test` (61 testes, unitários e de integração) e roteiros E2E no Chrome (`e2e/`) |

**Requisitos:** Git, Node.js **22.12+** (LTS) e MySQL Community Server 8.

## Instalação

📘 **Guia completo para Windows e macOS: [`docs/INSTALACAO.md`](docs/INSTALACAO.md)**

Resumo para quem já tem Git, Node.js e MySQL instalados:

```bash
# 1. Baixar (repositório privado: aceite antes o convite de colaborador)
git clone -b feat/enahub-mvp-03nov https://github.com/cauammedeiros/Plataforma-ENAHub.git
cd Plataforma-ENAHub

# 2. Criar o usuário do banco (uma vez). Entre no MySQL como root e rode os comandos
#    de database/criar_usuario_mysql.sql trocando a senha (não edite nem faça commit do arquivo).
mysql -u root -p

# 3. Back-end
cd backend
cp .env.example .env           # Windows: copy .env.example .env  → depois preencha DB_PASSWORD
npm install
npm run db:setup               # cria o banco "enahub" + migrations + dados de demonstração
npm run verificar              # diagnóstico do ambiente; deve terminar com "Tudo pronto!"
npm start                      # http://localhost:3000

# 4. Front-end (em outro terminal)
cd frontend
npm install
npm run dev                    # abra http://localhost:5173
```

### Contas de demonstração (senha `Enahub@2026`)

| Perfil | E-mail |
|---|---|
| Aluno | `aluno@enahub.demo` |
| Professor | `professor@enahub.demo` |
| Administrador | `admin@enahub.demo` |
| Alunos com histórico (ranking) | `bruna@enahub.demo`, `rafael@enahub.demo` |

Criadas pelo `npm run db:setup`, **apenas para uso local**. Contas novas criadas na tela de cadastro são sempre de aluno; o administrador pode promovê-las em Administração → Usuários.

> As 32 questões da seed são **demonstrativas**, elaboradas pela equipe, e **não são questões oficiais do ENADE/INEP**. Elas aparecem com o selo "Demonstrativa".

## Comandos do back-end

| Comando | O que faz | Apaga dados? |
|---|---|---|
| `npm start` / `npm run dev` | inicia a API (`dev` reinicia ao salvar arquivos) | não |
| `npm run db:setup` | `db:migrate` + `db:seed` | não |
| `npm run db:migrate` | aplica as migrations pendentes. Para e pede backup se encontrar um banco antigo criado pelo `enahub.sql` | não |
| `npm run db:seed` | insere os dados de demonstração que faltam (idempotente) | não |
| `npm run verificar` | diagnóstico do ambiente | não (só leitura) |
| `npm test` | 61 testes automatizados | **só o banco `enahub_test`**, recriado a cada execução |
| `npm run test:unit` | 17 testes unitários (sem MySQL) | não |

> ⚠️ `database/enahub.sql` é o dump histórico da estrutura inicial e contém `DROP TABLE`. **Não o execute.** Use as migrations.

## Testes

```bash
cd backend && npm test          # não toca no banco principal "enahub"
cd ../frontend && npm run lint && npm run build
```

Os roteiros no navegador ficam em [`e2e/README.md`](e2e/README.md). Eles criam dados de teste no banco `enahub`. Os resultados registrados estão em [`docs/TESTES.md`](docs/TESTES.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/GUIA_EQUIPE.md`](docs/GUIA_EQUIPE.md) | guia rápido para a equipe instalar e testar |
| [`docs/INSTALACAO.md`](docs/INSTALACAO.md) | instalação passo a passo (Windows e macOS), `.env`, MySQL e problemas comuns |
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | como o sistema funciona e como explicá-lo ao professor |
| [`docs/ROTEIRO_DEMONSTRACAO.md`](docs/ROTEIRO_DEMONSTRACAO.md) | apresentação de 03/11/2026 e planos B |
| [`docs/REQUISITOS.md`](docs/REQUISITOS.md) | matriz RF001–RF033 e RNFs com o status de cada um |
| [`docs/TESTES.md`](docs/TESTES.md) | relatório de testes |
| [`docs/API.md`](docs/API.md) | endpoints, perfis de acesso e regras de cálculo |

## Estrutura

```text
Plataforma-ENAHub/
├── backend/        API REST (src/routes → controllers → services → banco), scripts e testes
├── frontend/       aplicação React (pages, components, api, contexts)
├── database/       migrations, seeds, script do usuário MySQL e dump histórico
├── e2e/            testes ponta a ponta no navegador (opcional)
└── docs/           documentação
```

## Segurança (resumo)

- Senhas com hash `scrypt` e salt; sessão por token aleatório (o banco guarda só o hash).
- Permissões por perfil verificadas no servidor; SQL sempre parametrizado.
- A alternativa correta nunca é enviada ao aluno antes de o simulado ser finalizado.
- Limite de tentativas de login e de recuperação de senha; logs de erro sem dados sensíveis.
- `.env` não é versionado (use os arquivos `.env.example`).
