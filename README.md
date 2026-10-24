# ENAHub — Plataforma de Estudos para o ENADE

Projeto acadêmico da disciplina **Desenvolvimento de Plataformas Web** do curso de Ciência da Computação da UNIFOR.

Equipe: Marco Cauã (back-end) · Pedro Pompeu (front-end) · João Victor (UI/UX) · Cauã Melo (gerência)

O ENAHub reúne em uma única plataforma o banco de questões, os simulados cronometrados com correção automática, o gabarito comentado, o acompanhamento de desempenho, o fórum e as ferramentas administrativas.

| Camada | Tecnologias |
|---|---|
| Front-end | React 19, React Router 7, Bootstrap 5, Vite |
| Back-end | Node.js, Express 5, mysql2 |
| Banco de dados | MySQL 8 ou superior |
| Testes | `node:test` (unitários e de integração) |

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
└── docs/           API, requisitos, testes e roteiro de demonstração
```

## Como executar (macOS)

### 1. Pré-requisitos

```bash
brew install node mysql        # Node.js 20+ e MySQL 8+
brew services start mysql
```

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

Se a porta 3000 já estiver ocupada por outro programa, use `PORT=3001` no `backend/.env` e inicie o front-end com
`VITE_API_PROXY=http://localhost:3001 npm run dev`.

### Contas de demonstração

Elas são criadas por `npm run db:seed`. A senha de todas é **`Enahub@2026`**, e o seed não roda com `NODE_ENV=production`.

| Perfil | E-mail |
|---|---|
| Administrador | `admin@enahub.demo` |
| Professor | `professor@enahub.demo` |
| Aluno | `aluno@enahub.demo` |
| Alunos com histórico (aparecem no ranking) | `bruna@enahub.demo`, `rafael@enahub.demo` |

Também é possível criar uma conta nova pela tela de cadastro. Toda conta nova recebe o perfil **aluno**, e somente o administrador pode promovê-la a professor ou administrador na tela de Administração.

> **Sobre as questões:** as 32 questões da seed foram **elaboradas pela equipe para demonstração** e **não são questões oficiais do ENADE/INEP**. Elas aparecem com o selo "Demonstrativa". O campo "ano" dessas questões é só um ano de referência, usado para demonstrar o filtro. Ao cadastrar questões oficiais, marque "Questão oficial do ENADE" e informe a fonte.

## Banco de dados

- As migrations em `database/migrations` são aplicadas em ordem pelo `npm run db:migrate`, que registra o que já rodou na tabela `schema_migrations`.
  - `001_estrutura_inicial.sql` recria a estrutura do dump original **sem `DROP TABLE`**.
  - `002_expansao_modelo_logico.sql` implementa o Modelo Lógico do Plano de Trabalho. Ela migra os dados já existentes (por exemplo, as colunas `alternativa_a..e` passam para a tabela `alternativas`) antes de remover as colunas antigas.
- **Quem já importou o `database/enahub.sql`** pode rodar `npm run db:migrate` sobre o próprio banco. Mesmo assim, faça backup antes, porque no MySQL os comandos `ALTER TABLE` não podem ser desfeitos:
  `mysqldump -u enahub_app -p enahub > backup_enahub.sql`
- O `database/enahub.sql` foi mantido como histórico da equipe. **Não o execute sobre um banco com dados**, porque ele apaga as tabelas.

## Testes

```bash
cd backend
npm test            # 51 testes: unitários + integração (usa o banco enahub_test, recriado a cada execução)
npm run test:unit   # só os unitários (não precisam de MySQL)

cd ../frontend
npm run lint
npm run build
```

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
- Limite de tentativas no login e na recuperação de senha.
- O arquivo `.env` não é versionado; use `backend/.env.example` como modelo.
