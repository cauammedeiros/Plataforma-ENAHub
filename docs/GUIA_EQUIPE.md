# ENAHub — guia rápido para a equipe

Pessoal, a versão completa do ENAHub está no repositório privado **cauammedeiros/Plataforma-ENAHub**. Para só **usar** o sistema, não precisa instalar nada: acesse **https://plataforma-enahub.vercel.app**, clique em **Criar conta** e use o código de convite que mandei no grupo. Para rodar **localmente** (desenvolvimento ou plano B da apresentação), siga os passos abaixo; o guia detalhado com prints dos problemas comuns está em `docs/INSTALACAO.md`.

## 1. Instale (uma vez)
- **Git**, **Node.js LTS (22.12 ou maior)** e **MySQL Community Server 8** (no Windows: MySQL Installer; anote a senha do root).
- ⚠️ **Não use o MySQL/MariaDB do XAMPP.** Se o XAMPP estiver ligado, pare o MySQL dele.

## 2. Aceite o convite e baixe a branch certa
Aceite o convite de colaborador que chegou no seu e-mail do GitHub e rode:
```bash
git clone -b feat/enahub-mvp-03nov https://github.com/cauammedeiros/Plataforma-ENAHub.git
cd Plataforma-ENAHub
git branch --show-current        # tem que aparecer: feat/enahub-mvp-03nov
```
> A `main` é só a estrutura inicial. Se aparecer `main`: `git switch feat/enahub-mvp-03nov`

## 3. Crie o usuário do banco (uma vez)
Entre no MySQL como root (`mysql -u root -p`, ou "MySQL 8.0 Command Line Client" no Windows) e cole, **trocando a senha**:
```sql
CREATE USER IF NOT EXISTS 'enahub_app'@'localhost' IDENTIFIED BY 'SuaSenhaAqui123';
GRANT ALL PRIVILEGES ON enahub.* TO 'enahub_app'@'localhost';
GRANT ALL PRIVILEGES ON enahub_test.* TO 'enahub_app'@'localhost';
FLUSH PRIVILEGES;
```

## 4. Configure e prepare o back-end
```bash
cd backend
cp .env.example .env             # Windows: copy .env.example .env
```
Abra `backend/.env` e coloque a senha do passo 3 em `DB_PASSWORD=`. **Nunca suba o `.env` para o GitHub.**
```bash
npm install
npm run db:setup                 # cria o banco e os dados de demonstração (não apaga nada)
npm run verificar                # tem que terminar com "Tudo pronto!"
```

## 5. Rode (dois terminais)
```bash
# Terminal 1
cd backend
npm start

# Terminal 2
cd frontend
npm install                      # só na primeira vez
npm run dev
```
Abra **http://localhost:5173**

## 6. Entre e teste (senha de todos: `Enahub@2026`)
- **Aluno:** `aluno@enahub.demo` → Questões → Simulados (faça um de 5 questões, aperte F5 no meio, finalize e veja o gabarito).
- **Professor:** `professor@enahub.demo` → Gestão → Nova questão.
- **Admin:** `admin@enahub.demo` → Administração (aprovar a questão, usuários, relatórios).

## 7. Testes automáticos (opcional, não mexe no banco principal)
```bash
cd backend
npm test                         # 61 testes; usa só o banco "enahub_test"
```

## Deu erro?
1. Rode `npm run verificar` dentro de `backend/`: ele diz o que está errado e como corrigir.
2. Veja "Problemas comuns" em `docs/INSTALACAO.md`.
3. Mande no grupo a mensagem de erro **sem** o conteúdo do seu `.env`.

## Para a apresentação (03/11)
- Como o sistema funciona e o que cada um explica: `docs/ARQUITETURA.md`
- Roteiro da demonstração e planos B: `docs/ROTEIRO_DEMONSTRACAO.md`
- **Não façam push direto na `main` nem merge do PR #1**: combinem antes no grupo.
