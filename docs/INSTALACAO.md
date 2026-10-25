# Guia de instalação local — Plataforma ENAHub

Passo a passo para rodar o ENAHub no **seu computador** (Windows ou macOS). Não é preciso hospedagem nem internet depois da instalação.

> **Tempo estimado:** 20–30 minutos na primeira vez.
> **Branch correta:** `feat/enahub-mvp-03nov` (versão completa). A `main` contém apenas a estrutura inicial.

---

## 0. O que você vai instalar

| Programa | Versão | Para quê |
|---|---|---|
| **Git** | qualquer recente | baixar o repositório |
| **Node.js** | **22.12 ou superior** (LTS) | rodar o back-end e o front-end |
| **MySQL Community Server** | **8.0.19 ou superior** (testado em 8.0.46 e 9.3) | banco de dados |
| Navegador | Chrome, Edge, Safari ou Firefox | usar o sistema |

> ⚠️ **XAMPP / MariaDB não funcionam.** O ENAHub usa recursos do MySQL 8 (collation `utf8mb4_0900_ai_ci`, `INSERT ... AS ... ON DUPLICATE KEY`). Se você tem o XAMPP, **pare o MySQL do XAMPP** (ele ocupa a porta 3306) e instale o MySQL Community Server.

### Windows

1. **Git:** https://git-scm.com/download/win (opções padrão do instalador).
2. **Node.js:** https://nodejs.org → botão **LTS** (opções padrão; marque "Add to PATH").
3. **MySQL:** https://dev.mysql.com/downloads/installer → **MySQL Installer for Windows**.
   - Escolha **Server only** (ou "Custom" com *MySQL Server* + *MySQL Shell/Workbench* se quiser interface gráfica).
   - Em *Authentication*, deixe **Use Strong Password Encryption** (padrão).
   - Defina e **anote a senha do usuário root**.
   - Deixe marcado **Configure MySQL Server as a Windows Service** (nome `MySQL80`, iniciar com o Windows).
4. Feche e abra de novo o terminal (PowerShell ou Prompt de Comando) e confira:
   ```powershell
   git --version
   node --version     # precisa mostrar v22.12 ou maior
   npm --version
   ```

### macOS

```bash
# Homebrew (se ainda não tiver): https://brew.sh
brew install git node mysql
brew services start mysql
mysql_secure_installation      # defina a senha do root (opcional, mas recomendado)
node --version                 # v22.12 ou maior
```

> Alternativa: instalador oficial do MySQL para macOS (dev.mysql.com/downloads/mysql). Funciona igual.

---

## 1. Baixar o repositório (privado)

O repositório é **privado**: o dono (cauammedeiros) precisa adicionar você como colaborador. Aceite o convite que chega por e-mail ou em https://github.com/notifications.

```bash
git clone -b feat/enahub-mvp-03nov https://github.com/cauammedeiros/Plataforma-ENAHub.git
cd Plataforma-ENAHub
git branch --show-current      # deve mostrar: feat/enahub-mvp-03nov
```

- Na primeira vez, o Git pede login do GitHub. No Windows abre uma janela do navegador; no macOS use o GitHub CLI (`brew install gh && gh auth login --web`) ou um *personal access token* como senha. **Senha comum da conta não funciona no Git.**
- Se você clonou sem `-b` e está na `main`: `git switch feat/enahub-mvp-03nov`.
- Para receber atualizações depois: `git pull`.

---

## 2. Criar o usuário do banco (uma única vez)

O ENAHub **não usa o root**: ele usa um usuário próprio, `enahub_app`, com acesso só aos bancos `enahub` (principal) e `enahub_test` (testes automáticos).

Escolha **uma senha sua** para o `enahub_app` (ex.: `MinhaSenhaLocal123`). Ela fica só no seu computador.

> ❗ Não edite e não faça commit de nenhum arquivo do repositório com a sua senha. Os comandos abaixo são digitados direto no MySQL.

### Opção A — Terminal (macOS, Linux ou Windows com `mysql` no PATH)

```bash
mysql -u root -p
```

### Opção B — Windows sem `mysql` no PATH

Abra pelo menu Iniciar o **MySQL 8.0 Command Line Client** (ou o **MySQL Workbench** → conexão *Local instance*) e digite a senha do root.

### Em ambos os casos, cole os comandos (trocando a senha):

```sql
CREATE USER IF NOT EXISTS 'enahub_app'@'localhost' IDENTIFIED BY 'MinhaSenhaLocal123';
GRANT ALL PRIVILEGES ON enahub.* TO 'enahub_app'@'localhost';
GRANT ALL PRIVILEGES ON enahub_test.* TO 'enahub_app'@'localhost';
FLUSH PRIVILEGES;
exit
```

Os mesmos comandos estão em `database/criar_usuario_mysql.sql` (com uma senha de exemplo).

---

## 3. Configurar o back-end (`backend/.env`)

```bash
cd backend
cp .env.example .env           # Windows (PowerShell ou CMD): copy .env.example .env
```

Abra `backend/.env` num editor (VS Code, Bloco de Notas) e troque **apenas** a senha:

```ini
DB_PASSWORD=MinhaSenhaLocal123
```

Os demais valores já servem para a maioria dos computadores:

| Variável | Padrão | Quando mudar |
|---|---|---|
| `DB_HOST` / `DB_PORT` | `localhost` / `3306` | MySQL em outra porta |
| `DB_USER` | `enahub_app` | usou outro nome no passo 2 |
| `DB_NAME` / `DB_NAME_TEST` | `enahub` / `enahub_test` | raramente |
| `PORT` | `3000` | porta 3000 ocupada (ver "Problemas comuns") |
| `RECUPERACAO_LINK_NA_RESPOSTA` | `false` | `true` só para demonstrar a recuperação de senha na tela, **apenas localmente** |

> O arquivo `.env` está no `.gitignore` e **nunca** deve ir para o GitHub.

---

## 4. Instalar, criar o banco e verificar

Ainda dentro de `backend/`:

```bash
npm install
npm run db:setup       # cria o banco "enahub", aplica as migrations e carrega a demonstração
npm run verificar      # diagnóstico: deve terminar com "Tudo pronto!"
```

O `npm run verificar` confere branch, Node, `.env`, conexão e versão do MySQL, migrations, contas de demonstração e porta, e explica como corrigir cada problema.

Depois, o front-end:

```bash
cd ../frontend
npm install
```

---

## 5. Iniciar o ENAHub (sempre que for usar)

São **dois terminais** abertos ao mesmo tempo:

**Terminal 1 — back-end**
```bash
cd Plataforma-ENAHub/backend
npm start                      # "Servidor rodando em http://localhost:3000"
```

**Terminal 2 — front-end**
```bash
cd Plataforma-ENAHub/frontend
npm run dev                    # "Local: http://localhost:5173/"
```

Abra **http://localhost:5173** no navegador. Para parar, use `Ctrl + C` em cada terminal.

---

## 6. Contas de demonstração

Criadas pelo `npm run db:setup` (ou `npm run db:seed`). **Senha de todas: `Enahub@2026`**

| Perfil | E-mail | O que testar |
|---|---|---|
| Aluno | `aluno@enahub.demo` | questões, simulado, resultado, desempenho, fórum |
| Professor | `professor@enahub.demo` | Gestão → nova questão (fica pendente), comentários |
| Administrador | `admin@enahub.demo` | Administração: aprovar questões, usuários, denúncias, simulados oficiais, categorias, relatórios |
| Alunos com histórico | `bruna@enahub.demo`, `rafael@enahub.demo` | aparecem no ranking |

Você também pode **criar sua própria conta** em "Criar conta" (sempre como aluno). Para virar professor/admin, entre como `admin@enahub.demo` → Administração → Usuários → altere o perfil.

> As 32 questões são **demonstrativas** (elaboradas pela equipe), **não** são questões oficiais do ENADE. As contas e a senha servem apenas para uso local.

---

## 7. Roteiro rápido de teste (5 minutos)

1. Entre como `aluno@enahub.demo`.
2. **Questões** → filtre por curso "Análise e Desenvolvimento de Sistemas" → Visualizar → responda.
3. **Simulados** → 5 questões, 10 minutos → Iniciar → responda 2 questões → aperte **F5** (as respostas e o tempo continuam) → Finalizar.
4. Veja a nota e clique em **Ver Gabarito Comentado**.
5. **Início** e **Desempenho** mostram o resultado.
6. Saia e entre como `admin@enahub.demo` → **Administração** → Relatórios.

---

## 8. Testes automatizados (sem mexer no banco principal)

```bash
cd backend
npm run test:unit      # 17 testes, não precisa de MySQL
npm test               # 61 testes (unitários + integração)
```

- `npm test` usa **somente** o banco `enahub_test`, que é **apagado e recriado** a cada execução. O banco `enahub` (seus dados e a demonstração) **não é tocado**.
- Proteção: o nome do banco de testes precisa terminar em `_test` e ser diferente de `DB_NAME`; caso contrário os testes nem começam.
- Não é preciso deixar o servidor rodando para o `npm test`.

Front-end:
```bash
cd frontend
npm run lint
npm run build
```

Testes no navegador (opcionais): veja `e2e/README.md`. Atenção: eles **criam dados de teste** no banco `enahub`.

---

## 9. O que cada comando faz com os dados

| Comando | Apaga dados? | Observação |
|---|---|---|
| `npm run db:setup` | **Não** | = `db:migrate` + `db:seed` |
| `npm run db:migrate` | **Não** | Cria o banco se não existir e aplica só as migrations pendentes. Se encontrar um banco antigo criado pelo `database/enahub.sql`, **para e pede backup** antes (`npm run db:migrate -- --confirmar`) |
| `npm run db:seed` | **Não** | Só insere o que falta; pode rodar várias vezes. Bloqueado com `NODE_ENV=production` |
| `npm test` | Só o `enahub_test` | Nunca o `enahub` |
| `npm run verificar` | **Não** | Apenas lê |
| `database/enahub.sql` | **SIM** | Arquivo histórico com `DROP TABLE`. **Não execute.** |

### Voltar o banco ao estado inicial da demonstração (apaga o `enahub`)

```bash
mysqldump -u enahub_app -p --no-tablespaces enahub > backup_enahub.sql   # backup antes!
mysql -u enahub_app -p -e "DROP DATABASE enahub"
cd backend && npm run db:setup
```
(Windows sem `mysql` no PATH: rode `DROP DATABASE enahub;` no MySQL Command Line Client/Workbench.)

---

## 10. Problemas comuns

| Sintoma | Solução |
|---|---|
| `'node' não é reconhecido` / `command not found: node` | Reinstale o Node.js LTS e **abra um novo terminal** |
| `npm run verificar` acusa Node antigo | Instale o Node.js LTS (22.12+) |
| `ECONNREFUSED` ao conectar no MySQL | MySQL parado. Windows: *Serviços* → `MySQL80` → Iniciar. macOS: `brew services start mysql` |
| `ER_ACCESS_DENIED_ERROR` | Senha do `.env` diferente da usada no passo 2, ou usuário não criado |
| `Servidor é MariaDB` | Você está usando o XAMPP. Pare-o e use o MySQL Community Server |
| `A porta 3000 já está em uso` | Em `backend/.env`: `PORT=3001`. Copie `frontend/.env.example` para `frontend/.env.local` e ajuste `VITE_API_PROXY=http://localhost:3001`. Reinicie os dois |
| Login mostra "Não foi possível conectar ao servidor" | O Terminal 1 (back-end) não está rodando ou está em outra porta |
| `Muitas tentativas` no login | 10 erros seguidos para o mesmo e-mail; aguarde 15 min ou reinicie o back-end |
| Pastas `backend/src`, `docs`… não existem | Você está na `main`: `git switch feat/enahub-mvp-03nov` |
| `db:migrate` pede `--confirmar` | Seu banco foi criado pelo `enahub.sql` antigo. Faça o backup indicado e rode `npm run db:migrate -- --confirmar` |
| Esqueci a senha do `enahub_app` | Como root: `ALTER USER 'enahub_app'@'localhost' IDENTIFIED BY 'NovaSenha123';` e atualize o `.env` |
| PowerShell: `<` não é suportado | Use o MySQL Command Line Client/Workbench (passo 2, opção B) ou o Prompt de Comando (`cmd`) |
