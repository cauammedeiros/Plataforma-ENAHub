# Arquitetura da Plataforma ENAHub — guia para a equipe

Objetivo: que qualquer integrante consiga **entender o código** e **explicar o projeto ao professor**.

## 1. Visão geral (cliente-servidor em 3 camadas)

Exatamente a arquitetura prevista no Plano de Trabalho (slide "Arquitetura Cliente-Servidor"):

```
 Navegador (React + Bootstrap)          Servidor (Node.js + Express)            Banco (MySQL 8)
 ┌──────────────────────────┐   HTTP   ┌──────────────────────────────┐   SQL   ┌───────────────────┐
 │ páginas e componentes    │  JSON    │ rotas → controllers →        │ ──────► │ tabelas, chaves   │
 │ (frontend/src)           │ ───────► │ services → banco             │ ◄────── │ estrangeiras,     │
 │ guarda só o token        │ ◄─────── │ regras de negócio, segurança │         │ índices           │
 └──────────────────────────┘ /api/... └──────────────────────────────┘         └───────────────────┘
      localhost:5173                         localhost:3000                       localhost:3306
```

- O **front-end** nunca acessa o banco: ele chama a API REST (`/api/...`).
- O **back-end** valida, aplica as regras (permissões, tempo do simulado, correção) e conversa com o MySQL.
- O **banco** guarda tudo de forma relacional e consistente (chaves estrangeiras, unicidade, índices).
- Em desenvolvimento, o Vite (porta 5173) encaminha `/api` para o back-end (porta 3000).

## 2. Mapa das pastas

```
backend/
  src/server.js          inicia o servidor e as rotinas periódicas (finalizar simulados vencidos, limpar sessões)
  src/app.js             monta o Express: JSON, CORS, rotas /api, tratamento de erros
  src/routes/            QUAL URL chama QUAL função (e quem pode acessar)
  src/controllers/       lê e valida a requisição, chama o service, monta a resposta
  src/services/          REGRAS DE NEGÓCIO e consultas SQL (o "coração")
  src/middlewares/       autenticação/perfis, limite de tentativas, tratamento de erros
  src/utils/             cálculo da nota, hash de senha, tokens, validação
  scripts/               migrate.js, seed.js, verificar.js
  tests/                 unit/ (funções puras) e integracao/ (API + MySQL reais)
frontend/src/
  pages/                 uma tela por arquivo (Login, Simulados, Resultado, Admin...)
  components/            peças reutilizáveis (Campo, Modal, Alternativas, Navbar...)
  api/cliente.js         todas as chamadas HTTP passam por aqui
  contexts/              sessão do usuário (AuthProvider) e mensagens (ToastProvider)
database/
  migrations/            001 (estrutura inicial), 002 (modelo lógico), 003 (ajuste MySQL 8.0)
  seeds/                 dados de demonstração (JSON)
e2e/                     testes no navegador
docs/                    API, requisitos, testes, instalação, roteiro
```

**Regra de ouro do back-end:** rota → controller → service → banco. Ex.: salvar uma resposta passa por
`routes/simulados.routes.js` → `controllers/simulados.controller.js` (`salvarResposta`) → `services/simulados.service.js` (`salvarResposta`) → tabela `respostas`.

## 3. Modelo de dados (resumo)

Baseado no **Modelo Lógico (seção 12.2 do Plano)**, com nomes no plural como no SQL original da equipe:

| Tabela | Guarda | Relacionamentos principais |
|---|---|---|
| `usuarios` | nome, e-mail (único), hash da senha, perfil (aluno/professor/admin), bloqueio | → `cursos`, `instituicoes` |
| `cursos`, `instituicoes`, `temas` | categorias | `temas` → `cursos` |
| `questoes` | enunciado, ano, dificuldade, status (pendente/aprovada/rejeitada/arquivada), oficial ou demonstrativa | → `cursos`, `temas`, autor |
| `alternativas` | letra A–E, texto, se é a correta | → `questoes` |
| `comentarios_questao` | explicação (texto, URL de imagem/vídeo) | → `questoes`, autor |
| `simulados` | **uma tentativa** do aluno: início, prazo (`data_limite`), status, resultado (acertos, erros, em branco, %, nota) | → `usuarios`, `modelos_simulado` |
| `simulado_questoes` | questões sorteadas e ordem; `acertou` após a correção | → `simulados`, `questoes` |
| `respostas` | alternativa escolhida (1 por questão por tentativa) | → `simulado_questoes`, `alternativas` |
| `modelos_simulado` | simulados oficiais criados pelo admin | → questões fixas |
| `favoritos`, `topicos`, `respostas_forum`, `curtidas`, `denuncias` | favoritos e fórum | → `usuarios` |
| `sessoes`, `tokens_recuperacao`, `acessos` | login, recuperação de senha, relatório de acessos | → `usuarios` |

Excluir um usuário apaga em cascata os dados pessoais dele (LGPD). Questões já usadas em simulados não são apagadas: viram "arquivadas", para não quebrar o histórico.

## 4. Como funcionam as partes que o professor deve perguntar

### Login e permissões
1. Cadastro: a senha vira um **hash `scrypt` com salt** (nunca é guardada em texto).
2. Login correto → o servidor gera um **token aleatório**, guarda **só o hash** dele na tabela `sessoes` e devolve o token ao navegador.
3. Cada requisição envia `Authorization: Bearer <token>`. O middleware `autenticar` busca a sessão e o usuário; `autorizar('admin')` bloqueia quem não tem o perfil.
4. Logout apaga a sessão; bloquear um usuário apaga todas as sessões dele.
> **As permissões são verificadas no servidor.** Esconder um botão no front-end é só conforto visual; a API recusa (403) mesmo se alguém chamar a rota diretamente.

### Simulado (RF013–RF019) — passo a passo
1. **Criar** (`POST /api/simulados`): sorteia N questões aprovadas (`ORDER BY RAND()`), grava `data_inicio` e `data_limite = início + tempo`. Uma transação com `SELECT ... FOR UPDATE` impede dois simulados em andamento para o mesmo aluno.
2. **Resolver** (`GET /api/simulados/:id`): devolve questões e alternativas **sem dizer qual é a correta**, as respostas já salvas e o **tempo restante calculado pelo servidor**. Por isso o F5 não reinicia o tempo e não existe pausa.
3. **Salvar resposta** (`PUT .../respostas/:questaoId`) a cada clique. Se o prazo passou, o servidor recusa e finaliza o simulado.
4. **Finalizar**: pelo botão, pelo cronômetro do navegador ou por uma **rotina do servidor a cada 30 s** (funciona mesmo com o navegador fechado). A correção roda numa transação com a linha bloqueada e um `UPDATE ... WHERE status = 'em_andamento'`: clicar duas vezes **não gera dois resultados**.
5. **Resultado** (`backend/src/utils/pontuacao.js`): `percentual = acertos / total × 100` e `nota = acertos / total × 10`. Ex.: 30 de 40 → 75% e nota 7,5. Erros e em branco são contados separadamente.
6. **Gabarito** só é liberado depois da finalização (antes disso a API responde 409).

### Banco de questões e aprovação
- Professor cadastra → questão **pendente** (invisível para alunos). Admin aprova → **publicada**.
- Filtros (curso, ano, tema, dificuldade, busca) viram parâmetros da URL e um `WHERE` com valores parametrizados (`?`), o que **impede SQL Injection**.

### Migrations e seeds
- Em vez de um único `.sql` que apaga tudo, o banco evolui por **migrations numeradas**; a tabela `schema_migrations` registra o que já rodou.
- A 002 converteu o modelo inicial (alternativas em colunas `alternativa_a..e`) para o modelo do Plano (tabela `alternativas`) **sem perder dados**; isso é testado automaticamente.

## 5. Qualidade e testes

- **61 testes automatizados** (`backend/tests`): cálculo da nota, permissões, simulado (tempo esgotado, F5, finalização simultânea, todas certas/erradas), migração de dados antigos, fórum e administração. Rodam no banco separado `enahub_test`.
- **Testados no MySQL 9.3 e no MySQL 8.0.46** (versão usada pela equipe).
- **2 roteiros E2E** no Chrome cobrem a jornada completa do aluno, professor e administrador.

## 6. Roteiro para explicar ao professor (por integrante)

| Integrante | Fala sobre | Mostre |
|---|---|---|
| Gerente (Cauã Melo) | problema, objetivos, requisitos e o que ficou pendente | `docs/REQUISITOS.md` (32 de 34 RF concluídos) |
| UI/UX (João Victor) | fidelidade aos wireframes, responsividade, feedback ao usuário | telas no navegador e no modo celular |
| Front-end (Pedro Pompeu) | React, rotas protegidas, componentes reutilizáveis, como o front chama a API | `frontend/src/pages`, `components`, `api/cliente.js` |
| Back-end (Marco Cauã) | camadas da API, segurança, regras do simulado, banco e migrations | `backend/src/services/simulados.service.js`, `database/migrations` |

**Frases curtas que resumem o projeto:**
- "O tempo do simulado é controlado pelo servidor; o navegador só mostra a contagem."
- "A resposta correta nunca sai do servidor antes de o aluno finalizar."
- "Toda permissão é verificada na API, não apenas escondida na tela."
- "O banco evolui por migrations, sem apagar os dados existentes."

## 7. Limitações conhecidas (seja transparente)

- Recuperação de senha sem envio real de e-mail (o link aparece no terminal) — RF003 parcial.
- Imagens e vídeos das explicações apenas por URL, sem upload — RF025 parcial.
- Sem teste de carga com 1.000 usuários e sem hospedagem 24/7 (decisão da equipe: execução local).
- "Enviar avisos aos usuários" (caso de uso) não foi implementado.
