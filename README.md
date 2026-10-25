# Plataforma ENAHub

**Sistema web de preparação para o ENADE** · Ciência da Computação · UNIFOR

Projeto acadêmico da disciplina **Desenvolvimento de Plataformas Web** do curso de Ciência da Computação da UNIFOR.

Equipe: Marco Cauã (back-end) · Pedro Pompeu (front-end) · João Victor (UI/UX) · Cauã Melo (gerência)

Repositório original da equipe: [MarcoMarola/ENAHub](https://github.com/MarcoMarola/ENAHub)

O ENAHub reúne em uma única plataforma o banco de questões, os simulados cronometrados com correção automática, o gabarito comentado, o acompanhamento de desempenho, o fórum e as ferramentas administrativas.

| Camada | Tecnologias |
|---|---|
| Front-end | React 19, React Router 7, Bootstrap 5, Vite |
| Back-end | Node.js, Express 5, mysql2 |
| Banco de dados | MySQL 8 ou superior |
| Testes | `node:test` (unitários e de integração) e roteiros E2E no Chrome (`e2e/`) |

**Versões:** Node.js **22.12 ou superior** (exigido pelo Vite 8 e pelo executor de testes) e MySQL **8.0 ou superior**.
O projeto foi testado com Node 26 e MySQL 9.3 no macOS. As migrations usam apenas recursos do MySQL 8.0 (`RENAME COLUMN`, `ROW_NUMBER()`, `INSERT ... AS ... ON DUPLICATE KEY`); mesmo assim, recomenda-se rodar `npm test` uma vez no MySQL 8.0 da equipe.

```text
ENAHub/
├── backend/        API REST (src/routes → controllers → services → banco)
│   ├── src/
│   ├── scripts/    migrate.js e seed.js
│   └── tests/      unit/ e integracao/
├── database/
│   ├── enahub.sql          dump original da equipe (contém DROP TABLE; ver abaixo)
│   ├── migrations/         scripts de criação/atualização do esquema (não destrutivos)
│   └── seeds/              dados de demonstração
├── frontend/       aplicação React
├── e2e/            testes ponta a ponta no navegador (opcional, dependências próprias)
└── docs/           API, requisitos, testes e roteiro de demonstração
```

## Como executar (macOS)

### 1. Pré-requisitos

macOS:
```bash
brew install node mysql        # Node.js 22.12+ e MySQL 8+
brew services start mysql
```

Windows: instale o Node.js LTS (nodejs.org) e o MySQL Server 8 (MySQL Installer). Os comandos abaixo são os mesmos;
troque `cp` por `copy` no Prompt de Comando.

### 2. Usuário do MySQL (uma única vez)

Edite a senha em `database/criar_usuario_mysql.sql` e execute como root:

```bash
mysql -u root -p < database/criar_usuario_mysql.sql
```

### 3. Back-end

```bash
cd backend
cp .env.example .env           # coloque em DB_PASSWORD a mesma senha do passo 2
npm install
npm run db:setup               # cria o banco "enahub", aplica as migrations e carrega a demonstração
npm start                      # http://localhost:3000
```

Para conferir: abra `http://localhost:3000/teste-db`.

### 4. Front-end (em outro terminal)

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

A porta padrão é **3000**. Se ela já estiver ocupada por outro programa, o back-end avisa e encerra. Nesse caso:
1. defina `PORT=3001` (ou outra) no `backend/.env`;
2. copie `frontend/.env.example` para `frontend/.env.local` e ajuste `VITE_API_PROXY=http://localhost:3001`;
3. reinicie os dois servidores.

### Contas de demonstração

Elas são criadas por `npm run db:seed`. A senha de todas é **`Enahub@2026`**, e o seed não roda com `NODE_ENV=production`.

| Perfil | E-mail |
|---|---|
| Administrador | `admin@enahub.demo` |
| Professor | `professor@enahub.demo` |
| Aluno | `aluno@enahub.demo` |
| Alunos com histórico (aparecem no ranking) | `bruna@enahub.demo`, `rafael@enahub.demo` |

> Contas e senha **apenas para demonstração local**. Não use o seed em um servidor público.

Também é possível criar uma conta nova pela tela de cadastro. Toda conta nova recebe o perfil **aluno**, e somente o administrador pode promovê-la a professor ou administrador na tela de Administração.

> **Sobre as questões:** as 32 questões da seed foram **elaboradas pela equipe para demonstração** e **não são questões oficiais do ENADE/INEP**. Elas aparecem com o selo "Demonstrativa". O campo "ano" dessas questões é só um ano de referência, usado para demonstrar o filtro. Ao cadastrar questões oficiais, marque "Questão oficial do ENADE" e informe a fonte.

### Recuperação de senha na demonstração

Não há servidor de e-mail configurado (limitação documentada do RF003). O link de redefinição sempre aparece **no terminal do back-end**.
Para que ele apareça também na tela "Esqueci minha senha" durante uma demonstração local, use `RECUPERACAO_LINK_NA_RESPOSTA=true` no `backend/.env`. Isso só funciona com `NODE_ENV=development`. **Nunca ative essa opção num servidor acessível por outras pessoas.**

## Banco de dados

- As migrations em `database/migrations` são aplicadas em ordem pelo `npm run db:migrate`, que registra o que já rodou na tabela `schema_migrations`.
  - `001_estrutura_inicial.sql` recria a estrutura do dump original **sem `DROP TABLE`**.
  - `002_expansao_modelo_logico.sql` implementa o Modelo Lógico do Plano de Trabalho. Ela migra os dados já existentes (por exemplo, as colunas `alternativa_a..e` passam para a tabela `alternativas`) antes de remover as colunas antigas.
- **Quem já importou o `database/enahub.sql`** pode rodar `npm run db:migrate` sobre o próprio banco. Mesmo assim, faça backup antes, porque no MySQL os comandos `ALTER TABLE` não podem ser desfeitos:
  `mysqldump -u enahub_app -p enahub > backup_enahub.sql`
- O `database/enahub.sql` foi mantido como histórico da equipe. **Não o execute sobre um banco com dados**, porque ele apaga as tabelas.

## Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| `Não foi possível conectar ao MySQL` | O MySQL está parado (`brew services start mysql`) ou a senha/usuário em `backend/.env` está errada |
| `ER_ACCESS_DENIED_ERROR` | O usuário `enahub_app` não foi criado (passo 2) ou a senha em `DB_PASSWORD` é diferente |
| `A porta 3000 já está em uso` | Outro programa usa a porta: veja "A porta padrão é 3000" acima |
| Tela de login mostra "Não foi possível conectar ao servidor" | O back-end não está rodando ou o proxy do Vite aponta para outra porta (`frontend/.env.local`) |
| `npm test` falha com "Access denied" para `enahub_test` | O usuário precisa da permissão em `enahub_test.*` (já incluída em `database/criar_usuario_mysql.sql`) |
| `Muitas tentativas` no login | São 10 erros para o mesmo e-mail a cada 15 min; aguarde ou reinicie o back-end |
| Erro de versão do Node ao rodar o Vite/testes | Atualize para Node 22.12+ |
| Quero voltar o banco ao estado inicial | Faça backup e recrie: `mysqldump ... > backup.sql`, `DROP DATABASE enahub`, `npm run db:setup` (ver o roteiro de demonstração) |

## Testes

```bash
cd backend
npm test            # 51 testes: unitários + integração (usa o banco enahub_test, recriado a cada execução)
npm run test:unit   # só os unitários (não precisam de MySQL)

cd ../frontend
npm run lint
npm run build
```

Testes no navegador (opcionais; precisam do Google Chrome, do cliente `mysql` no PATH e dos dois servidores rodando):

```bash
cd e2e
npm install
npm run jornada    # aluno: cadastro → questões → simulado → resultado → gabarito, e mais
npm run gestao     # professor, administrador e moderação
```

Os roteiros E2E **criam dados de teste** (usuários `e2e.*`, tópicos, questões) no banco configurado. Rode-os numa cópia, ou restaure o banco depois. Em outro sistema operacional, informe o Chrome com `CHROME_PATH`.

O que foi executado e os resultados estão em [`docs/TESTES.md`](docs/TESTES.md).

## Documentação

- [`docs/API.md`](docs/API.md): todos os endpoints, perfis de acesso e regras de cálculo
- [`docs/REQUISITOS.md`](docs/REQUISITOS.md): matriz RF001–RF033 e RNF001–RNF010 com o status de cada requisito
- [`docs/TESTES.md`](docs/TESTES.md): relatório de testes
- [`docs/ROTEIRO_DEMONSTRACAO.md`](docs/ROTEIRO_DEMONSTRACAO.md): passo a passo para a apresentação

## Segurança (resumo)

- Senhas armazenadas com hash `scrypt` e salt aleatório (RNF009).
- Sessão por token aleatório: o banco guarda só o hash SHA-256 do token. O logout, o bloqueio e a troca de senha invalidam as sessões.
- Autorização por perfil sempre no servidor.
- Todas as consultas SQL são parametrizadas.
- A alternativa correta nunca é enviada ao aluno antes da finalização do simulado.
- Limite de tentativas: erros de login por IP + e-mail e pedidos de recuperação de senha.
- Logs de erro não incluem a consulta SQL com valores.
- O arquivo `.env` não é versionado; use `backend/.env.example` como modelo.
