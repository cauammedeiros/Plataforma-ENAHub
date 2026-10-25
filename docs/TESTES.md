# Relatório de testes do ENAHub

Execução: 24–25/10/2026, macOS (Apple Silicon), Node.js 26.12, MySQL Community Server 9.3.0 (instalador oficial) e **MySQL 8.0.46** (instância isolada, mesma versão usada pela equipe), Google Chrome (headless), branch `feat/enahub-mvp-03nov`.

Todos os resultados abaixo vieram de testes **realmente executados**. O que não foi testado está listado em "Limitações".

## 1. Resumo

| Verificação | Comando | Resultado |
|---|---|---|
| Testes unitários | `cd backend && npm run test:unit` | ✅ 17/17 |
| Testes de integração + unitários | `cd backend && npm test` | ✅ **61/61**, repetido 3 vezes seguidas sem falhas após a auditoria |
| Lint do front-end | `cd frontend && npm run lint` | ✅ sem erros |
| Build de produção | `cd frontend && npm run build` | ✅ concluído |
| Migrations em banco novo | `npm run db:migrate` | ✅ após a correção nº 1 (abaixo) |
| Seed idempotente | `npm run db:seed` (2×) | ✅ a 2ª execução não insere nada |
| Conexão MySQL | `GET /teste-db` | ✅ |
| Jornada E2E no navegador | `cd e2e && npm run jornada` | ✅ sem erros de console ou HTTP 5xx |
| Cenário E2E de gestão | `cd e2e && npm run gestao` | ✅ |
| Auditoria de dependências | `npm audit` em backend, frontend e e2e | ✅ 0 vulnerabilidades (correções de patch: `body-parser` no back-end; `zod`, dependência de desenvolvimento do ESLint, no front-end) |
| **Compatibilidade MySQL 8.0.46** | `npm test` + `db:setup` + `e2e` (jornada e gestão) sobre um MySQL 8.0.46 isolado (porta 3307) | ✅ **61/61** testes; app completo e os 2 roteiros E2E sem erros |
| Proteção do `db:migrate` em banco antigo | banco importado do `enahub.sql` + `db:migrate` sem/com `--confirmar` | ✅ sem confirmação nada é alterado; com confirmação os dados são preservados |
| Diagnóstico `npm run verificar` | cenário real, senha errada, banco inexistente, porta ocupada | ✅ cada problema identificado com a solução |
| Migration 003 no banco de demonstração | `npm run db:migrate` (com backup antes) | ✅ contagens iguais antes e depois (5 usuários, 32 questões, 2 simulados, 14 respostas, 2 tópicos) |

## 2. Testes automatizados do back-end (`backend/tests`)

Os testes de integração sobem a API em uma porta aleatória e usam **somente** o banco `enahub_test`. Esse banco é apagado e recriado no início de cada arquivo, por migrations e seed. Por segurança, o helper recusa nomes de banco que não terminem em `_test`.

**Unitários (17)**
- O cálculo do resultado segue o exemplo do enunciado: 30 acertos em 40 questões dão 75% e nota 7,5.
- Erros e questões em branco são contados separadamente.
- Simulado sem nenhuma resposta: todas as questões em branco e nota 0.
- 100% de acertos dá nota 10.
- Arredondamento: 1 de 3 dá 33,33%; 2 de 3 dá 66,67%.
- Total zero não causa divisão por zero.
- Combinações impossíveis são rejeitadas.
- `corrigir()` conta corretamente a partir das respostas.
- Hash de senha `scrypt` com salt; token aleatório com hash SHA-256.
- O validador acumula erros e normaliza o e-mail.
- Dias seguidos de estudo e abreviação de nomes no ranking.
- Limitador de tentativas: logins bem-sucedidos não bloqueiam; 3 falhas bloqueiam só aquele e-mail; o modo `contarTodas` vale para a recuperação de senha.

**Autenticação e permissões (13)**
- Campos obrigatórios do cadastro.
- A senha é guardada como hash.
- E-mail duplicado é recusado, sem diferenciar maiúsculas.
- Enviar um `perfil` no cadastro é ignorado.
- O login responde igual para senha errada e e-mail inexistente.
- Token ausente, inválido ou de sessão encerrada por logout retorna 401.
- Aluno e professor recebem 403 nas rotas restritas.
- O bloqueio derruba as sessões abertas.
- O link de recuperação de senha é de uso único.
- A troca de senha exige a senha atual.
- A exclusão de conta exige senha e a confirmação "EXCLUIR".
- Um novo pedido de recuperação invalida o link anterior, e o link não volta na resposta da API por padrão.
- A limpeza remove sessões e links vencidos.

**Banco de questões (11)**
- Filtros por curso, ano, tema e dificuldade, além da busca por texto.
- **O aluno não recebe o campo `correta` nem os comentários.**
- O modo prática corrige a resposta.
- Questão cadastrada pelo professor fica pendente e invisível ao aluno até a aprovação.
- Validações do cadastro de questão.
- O professor não edita a questão de outro autor.
- Questão já usada em simulado é arquivada, não apagada.
- Favoritos.
- Comentário com URL validada.
- O professor vê o gabarito e comenta questão de outro autor; o aluno não vê o gabarito.
- Categorias: o admin cadastra curso; o professor cadastra tema; duplicados (sem diferenciar maiúsculas e acentos) retornam 409; aluno e professor recebem 403 ao cadastrar curso.

**Simulados (12)**
- Limites de quantidade e de tempo; 422 quando não há questões suficientes.
- Fluxo completo com 10 questões (6 certas, 2 erradas, 2 em branco) resulta em 60% e nota 6. As respostas persistem ao recarregar e vale a última alternativa escolhida.
- O gabarito não é enviado antes do fim.
- Outro aluno recebe 404 ao tentar acessar o simulado.
- **Três finalizações simultâneas geram um único resultado.**
- **Todas corretas:** 5/5, 100%, nota 10. **Todas incorretas:** 0 acertos, 5 erros, 0 em branco, nota 0.
- **Três pedidos simultâneos de "iniciar simulado" criam apenas um** (os outros recebem 409).
- Simulado sem respostas termina com nota 0.
- **Prazo vencido:** a resposta enviada é recusada (409), o servidor finaliza com `finalizado_por = tempo` e conta apenas as respostas anteriores.
- A rotina periódica finaliza simulados abandonados.
- Abrir um simulado vencido o finaliza automaticamente.
- Alternativas de outra questão são rejeitadas.
- O modo prática fica bloqueado para questões do simulado em andamento.
- Simulado oficial.
- Histórico, estatísticas e ranking.

**Migrations sobre dados legados (3)**
- O `database/enahub.sql` original é importado e preenchido com usuário, questões no formato antigo (`alternativa_a..e`), simulado e respostas. Depois disso, as migrations rodam.
- Os dados foram preservados: alternativas convertidas com a alternativa correta, respostas mapeadas e acertos recalculados.
- Rodar as migrations de novo não altera nada.
- A 003 remove a coluna gerada criada por uma versão antiga da 002 e, executada de novo, não altera nada.

**Fórum, moderação e relatórios (5)**
- Tópico, resposta, curtir e descurtir, e busca.
- Denúncia procedente oculta o conteúdo; denúncia repetida é bloqueada.
- Só o autor ou o admin podem excluir.
- Relatórios.
- O admin não consegue bloquear a si mesmo e pode promover usuários.

## 3. Testes ponta a ponta no navegador (`e2e/`)

São executados no Google Chrome instalado (headless) com `playwright-core`, mantido fora das dependências da aplicação. Os dois roteiros conferem também os dados no MySQL.

**`npm run jornada`** (resultados da última execução)

| Etapa | Verificação | Resultado |
|---|---|---|
| Cadastro | Formulário vazio mostra 6 erros de validação; conta criada com perfil aluno e senha `scrypt` | ✅ |
| Início (conta nova) | Saudação com o nome real ("Olá, Estudante!"); indicadores "Nenhum ainda · 0/32 total · Sem atividade ainda" | ✅ |
| Teclado | Tab até o card "Banco de Questões" + Enter abre `/questoes` | ✅ |
| Banco de questões | Filtros curso + dificuldade + busca "SQL" refletidos na URL; favoritar; visualizar; responder no modo prática | ✅ |
| Simulado | 5 questões / 10 min; cronômetro inicia em 00:09:59; 3 respostas salvas no MySQL | ✅ |
| Recarregar a página | Continua com "Respondidas: 3 de 5" e o tempo não reinicia (00:09:59 → 00:09:57) | ✅ |
| Finalizar | Modal de confirmação; resultado na tela igual ao do banco | ✅ |
| Gabarito | 5 questões, alternativa correta marcada em todas, explicações exibidas | ✅ |
| Simulado finalizado | Abrir `/simulados/:id` redireciona ao resultado | ✅ |
| Início após o simulado | "0% de acertos · 3/32 total · 1 dia ativo", conferido com o MySQL (percentual do último simulado e 3 questões distintas respondidas) | ✅ |
| **Tempo esgotado** | Prazo encurtado no banco para 4 s; o navegador finaliza sozinho e o banco registra `finalizado_por = tempo` | ✅ |
| Desempenho | Gráfico de evolução com tooltip; histórico; ranking | ✅ |
| Favoritas, fórum, perfil | Lista; tópico, resposta e curtida; edição do nome | ✅ |
| Celular (390×844) | Início, menu e resultado; **0 px de rolagem horizontal** | ✅ |
| Logout | Token removido; `/desempenho` sem login redireciona para `/login` | ✅ |
| Administração | Abas Questões, Usuários, Denúncias, Simulados oficiais e Relatórios; validação de nova questão (7 campos) | ✅ |
| Console / HTTP | Nenhum erro de JavaScript nem resposta 5xx | ✅ |

**`npm run gestao`**
- O professor cadastra uma questão, que fica "Pendente".
- O professor comenta uma questão publicada de outro autor (o número de comentários aumenta em 1).
- O menu da conta fecha ao clicar fora.
- O admin cadastra um tema na aba Categorias.
- O aluno recebe "Questão não encontrada" ao abri-la e é redirecionado ao tentar acessar `/admin`.
- O admin aprova a questão, e ela passa a aparecer para o aluno.
- O aluno denuncia um tópico e o admin a analisa.
- No celular, o simulado oficial com 10 questões funciona sem rolagem horizontal.
- Nenhum erro.

## 4. Defeitos encontrados e corrigidos durante os testes

| # | Defeito | Como foi encontrado | Correção |
|---|---|---|---|
| 1 | A migration 002 falhava com "Cannot add foreign key constraint": o MySQL não aceita FK com `ON DELETE CASCADE` em base de coluna gerada `STORED` | Primeira execução real das migrations | A coluna `usuario_em_andamento` passou a ser `VIRTUAL`. Foi verificado que o índice único continua impedindo dois simulados em andamento |
| 2 | `server.js` anunciava "Servidor rodando" mesmo com a porta ocupada (o erro do `listen` no Express 5 era ignorado) | Porta 3000 ocupada por outro projeto local | O erro passa a ser tratado, com uma mensagem clara e encerramento do processo; a porta do proxy do Vite ficou configurável |
| 3 | A finalização automática era registrada como `usuario`, e não como `tempo` (o cronômetro disparava frações de segundo antes do prazo do servidor) | E2E no navegador | Prazo gravado em segundos inteiros, tempo restante enviado em ms e margem de 1 s no navegador |
| 4 | O cronômetro mostrava 00:10:01 num simulado de 10 min | E2E no navegador | O relógio local é sincronizado ao carregar |
| 5 | Concordância ("1 incorretas", "1 professores") e abas fora da paleta | Inspeção das screenshots | Função `plural()` e estilo das abas |
| 6 | Dois testes instáveis: um dependia da ordem dos dados, outro procurava o texto "correta" num enunciado sorteado | Repetição da suíte | O teste agora verifica as **chaves** retornadas pela API |
| 7 | `window.confirm` no fórum (diálogo nativo, fora do padrão visual) | Revisão antes do E2E | Substituído pelo modal do próprio app |

### Auditoria final (segunda rodada)

| # | Problema | Risco | Correção |
|---|---|---|---|
| 8 | Coluna gerada `VIRTUAL` com FK em cascata (regra "um simulado em andamento") não tem suporte confirmado no MySQL 8.0, a versão da equipe | Migration falhar na máquina dos integrantes | Coluna removida da 002; regra garantida por `SELECT ... FOR UPDATE` na linha do usuário; migration 003 condicional para bancos já migrados; teste de criação simultânea |
| 9 | O limitador de login contava também os logins bem-sucedidos, por IP | Bloqueio (429) durante a apresentação ao trocar de conta várias vezes | Conta só falhas, por IP + e-mail; recuperação de senha conta todos os pedidos |
| 10 | O link de recuperação voltava na resposta sempre que `NODE_ENV=development` | Se publicado em modo desenvolvimento, qualquer pessoa redefiniria a senha de qualquer conta | Exige `RECUPERACAO_LINK_NA_RESPOSTA=true` (padrão `false`); novo pedido invalida links anteriores; limpeza periódica de sessões e links vencidos |
| 11 | Log de erro 500 imprimia o objeto de erro do mysql2 (com a SQL e seus valores) | Exposição de e-mails/hashes em logs | Log com método, rota, código e stack, sem os valores |
| 12 | O professor só comentava as próprias questões pela interface | RF024 e o caso de uso "Adicionar comentários às questões" incompletos | Professores e admins veem o gabarito e comentam qualquer questão; o aluno continua sem acesso |
| 13 | "Questões respondidas" contava questões arquivadas no numerador, mas não no total | Métrica inconsistente (numerador poderia passar do total) | Conta só questões publicadas e distintas; texto explicativo no card |
| 14 | "0 dias ativos" mesmo sem nenhum histórico; ícones Unicode (⏱, 💬) viravam emoji colorido no Safari | Indicador pouco claro; inconsistência visual entre navegadores | "Sem atividade ainda" / "Retome hoje"; ícones SVG próprios |
| 15 | Denúncia de comentários de questão só pela API; menu da conta não fechava ao clicar fora | RF029 parcial na interface; usabilidade | Botão "Denunciar" nos comentários; menu fecha ao clicar fora ou com Esc |
| 16 | "Gerenciar categorias" (caso de uso) sem tela; cursos e temas aceitavam nomes duplicados | Caso de uso não demonstrável | Aba Categorias e verificação de duplicidade no back-end |
| 17 | `VITE_API_PROXY=... npm run dev` não funciona no Windows | Integrantes no Windows sem conseguir mudar a porta | O proxy também é lido de `frontend/.env.local` (`frontend/.env.example`) |
| 18 | Os roteiros E2E podiam travar indefinidamente quando um seletor não existia | Falha silenciosa | Tempo-limite de 15 s por ação |

## 5. Limitações (o que NÃO foi testado)

- **Safari:** não foi possível automatizar. O `safaridriver` exige a opção "Permitir automação remota", uma configuração de segurança do Mac que não foi alterada. O responsável pelo projeto avaliou manualmente as telas de login e início no Safari.
- **MySQL 8.0 no Windows:** a compatibilidade com o 8.0.46 foi comprovada no macOS. Ainda falta a primeira instalação real num Windows da equipe (MySQL Installer, PowerShell/CMD, `copy`, serviço `MySQL80`). O roteiro está em `docs/INSTALACAO.md`.
- **MariaDB/XAMPP:** não suportado (collation `utf8mb4_0900_ai_ci` e a sintaxe `INSERT ... AS ... ON DUPLICATE KEY`). O `npm run verificar` detecta e avisa.

- **Carga (RNF002, RNF008, RNF010):** não houve teste com 1.000 usuários simultâneos. As medições locais com um único usuário ficaram entre 3 e 10 ms por endpoint.
- **Envio real de e-mail (RF003):** não há SMTP configurado. Só o link gerado foi testado.
- **Outros navegadores:** testes apenas no Chrome. Safari e Firefox não foram testados.
- **Leitor de tela:** os atributos de acessibilidade foram revisados no código, mas não houve teste com VoiceOver.
- **Front-end:** não há testes unitários de componentes React. O front-end é coberto pelos roteiros E2E.
