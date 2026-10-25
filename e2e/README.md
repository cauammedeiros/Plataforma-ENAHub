# Testes ponta a ponta (E2E)

Roteiros que usam o **Google Chrome instalado** (modo headless) por meio do `playwright-core`.
Nenhum navegador é baixado, e esta pasta tem dependências próprias, separadas da aplicação.

## Pré-requisitos

- Back-end e front-end rodando (veja o README principal); por padrão, o front-end em `http://localhost:5173`
- Banco com o seed aplicado (`npm run db:setup` em `backend/`)
- Cliente `mysql` no PATH (o roteiro `jornada` lê `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` das variáveis de ambiente ou do `backend/.env`)
- Google Chrome. Fora do macOS, informe o executável: `CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`

## Uso

```bash
npm install
npm run jornada   # aluno: cadastro → questões → simulado → F5 → resultado → gabarito, tempo esgotado, fórum, perfil, celular, admin
npm run gestao    # professor cadastra/comenta → admin aprova → aluno vê; denúncia; categorias; simulado oficial no celular
```

Variáveis opcionais: `E2E_URL` (endereço do front-end) e `CHROME_PATH`.

## Atenção

- Os roteiros **gravam dados de teste** no banco configurado: usuários `e2e.*@unifor.br`, tópicos, uma questão do professor e um tema. Faça backup antes e restaure depois, ou recrie o banco de demonstração (`docs/ROTEIRO_DEMONSTRACAO.md`).
- O roteiro `jornada` encurta, direto no banco, o prazo de um simulado criado por ele mesmo, para testar a finalização automática por tempo.
- Cada roteiro imprime as verificações (`•`) e termina com a lista de erros de JavaScript ou respostas HTTP 5xx encontradas. As screenshots ficam em `e2e/shots/`, que não é versionada.
