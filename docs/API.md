# API REST do ENAHub

Base: `http://localhost:3000/api` (no front-end em desenvolvimento, o Vite encaminha `/api` para o back-end).

- Corpo das requisições e respostas em JSON.
- Autenticação: `Authorization: Bearer <token>`. O token é recebido no cadastro ou no login e vale por 7 dias. O banco guarda apenas o hash SHA-256 do token. O logout apaga a sessão.
- Formato dos erros: `{ "mensagem": "texto para o usuário", "erros": { "campo": "detalhe" } }`.
- Códigos usados: `400` (dados inválidos), `401` (não autenticado), `403` (sem permissão ou conta bloqueada), `404`, `409` (conflito, por exemplo simulado já finalizado ou e-mail duplicado), `422` (não há questões suficientes), `429` (excesso de tentativas).
- Limite de tentativas: `cadastro`, `login` e `redefinir-senha` aceitam até 10 respostas com erro por IP + e-mail a cada 15 min (logins bem-sucedidos não contam). `esqueci-senha` aceita até 5 pedidos por IP + e-mail a cada 15 min.

Perfis: **aluno**, **professor** e **admin**. Na tabela, 🔓 = rota pública, 👤 = qualquer usuário logado, 🎓 = professor ou admin, 🛡 = somente admin.

## Autenticação (RF001–RF003)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/cadastro` | 🔓 | `{nome, email, senha, curso_id, instituicao, aceite_termos: true}`. Sempre cria o perfil aluno. Retorna `{usuario, token}` |
| POST | `/auth/login` | 🔓 | `{email, senha}` → `{usuario, token, expiraEm}` |
| POST | `/auth/logout` | 👤 | Invalida o token atual |
| GET | `/auth/me` | 👤 | Dados do usuário logado |
| POST | `/auth/esqueci-senha` | 🔓 | `{email}`. Sempre responde com a mesma mensagem (não revela se o e-mail existe). Gera um link válido por 30 minutos e invalida os links anteriores. Sem servidor de e-mail, o link é registrado no console do back-end; ele só volta em `link_desenvolvimento` se `RECUPERACAO_LINK_NA_RESPOSTA=true` **e** `NODE_ENV=development` (uso exclusivo em demonstração local) |
| POST | `/auth/redefinir-senha` | 🔓 | `{token, nova_senha}`. O link é de uso único e encerra todas as sessões |

Regra de senha: de 8 a 72 caracteres, com letras e números. A senha é armazenada com hash `scrypt` e salt aleatório.

## Usuário (RF004, RF005)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| PUT | `/usuarios/me` | 👤 | `{nome?, curso_id?, instituicao?, senha_atual?, nova_senha?}`. Para trocar a senha, a senha atual é obrigatória |
| DELETE | `/usuarios/me` | 👤 | `{senha, confirmacao: "EXCLUIR"}`. Exclui a conta e os dados vinculados |

## Catálogo

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/cursos` | 🔓 | Lista de cursos |
| GET | `/instituicoes` | 🔓 | Lista de instituições |
| GET | `/temas?curso_id=` | 🔓 | Temas (áreas) do curso |
| GET | `/anos` | 🔓 | Anos com questões publicadas |
| POST | `/cursos` | 🛡 | `{nome}`. Retorna 409 se já existir (sem diferenciar maiúsculas e acentos) |
| POST | `/temas` | 🎓 | `{nome, curso_id?}`. Retorna 409 se já existir no mesmo curso |

## Questões (RF006–RF012, RF024, RF025, RF031)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/questoes` | 👤 | Filtros: `busca, curso_id, ano, tema_id, dificuldade (facil/media/dificil), favoritas=true, minhas=true, status (gestores), pagina, limite (até 50)`. O aluno vê apenas questões aprovadas |
| GET | `/questoes/favoritas` | 👤 | Questões favoritas do usuário |
| GET | `/questoes/:id` | 👤 | Questão com as alternativas, `pode_editar` e `pode_comentar`. **A alternativa correta e os comentários só são enviados a professores e administradores** |
| POST | `/questoes/:id/responder` | 👤 | Modo prática: `{alternativa_id}` → `{acertou, letra_correta, comentarios}`. Fica bloqueado (409) se a questão estiver no simulado em andamento do aluno |
| POST/DELETE | `/questoes/:id/favorito` | 👤 | Favoritar e desfavoritar |
| POST | `/questoes` | 🎓 | `{enunciado, ano?, dificuldade, curso_id, tema_id?, fonte?, oficial_enade?, alternativas: [{texto} ×5], correta: "A".."E"}`. Questão criada por professor fica **pendente**; criada por admin já é publicada |
| PUT | `/questoes/:id` | 🎓 | Mesmo corpo. O professor só edita as próprias questões, e a edição volta para aprovação |
| PATCH | `/questoes/:id/status` | 🛡 | `{status: "aprovada" \| "rejeitada"}` |
| DELETE | `/questoes/:id` | 🎓 | Exclui a questão. Se ela já foi usada em algum simulado, é **arquivada** para preservar o histórico |
| GET/POST | `/questoes/:id/comentarios` | 🎓 | Explicações `{texto, imagem_url?, video_url?}`, em qualquer questão (RF024). URLs aceitas apenas com http(s) |
| DELETE | `/questoes/:id/comentarios/:comentarioId` | 🎓 | Remove um comentário (o autor ou o admin) |

## Simulados (RF013–RF023, RF032)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/simulados` | 👤 | Personalizado: `{quantidade (1–80), tempo_minutos (5–300), curso_id?, tema_id?, dificuldade?}`. Oficial: `{modelo_id}`. As questões aprovadas são sorteadas, e o servidor grava `data_inicio` e `data_limite`. Retorna 409 se já houver um simulado em andamento e 422 se não houver questões suficientes |
| GET | `/simulados` | 👤 | Histórico do usuário |
| GET | `/simulados/em-andamento` | 👤 | `{simulado}` ou `{simulado: null}` |
| GET | `/simulados/oficiais` | 👤 | Simulados oficiais ativos |
| GET | `/simulados/:id` | 👤 (dono) | Questões, alternativas (sem gabarito), respostas já salvas e `tempo_restante_segundos` calculado no servidor. Se o prazo venceu, finaliza e devolve `status: "finalizado"` |
| PUT | `/simulados/:id/respostas/:questaoId` | 👤 (dono) | `{alternativa_id}` (ou `null` para limpar). Salvamento automático. Retorna 409 com `erros.finalizado = true` se o simulado já terminou ou o tempo acabou (há tolerância de 3 s para a latência da rede) |
| POST | `/simulados/:id/finalizar` | 👤 (dono) | Corrige e grava o resultado. **É idempotente:** chamadas repetidas ou simultâneas não geram um segundo resultado (`ja_finalizado: true`) |
| GET | `/simulados/:id/resultado` | 👤 (dono) | Nota, acertos, erros, em branco, percentual, desempenho por tema, comparação com outros alunos e gabarito comentado. Disponível somente após a finalização |

**Cálculo do resultado:** `percentual = acertos / total × 100` e `nota = acertos / total × 10`, ambos com duas casas decimais. "Erros" são as questões respondidas incorretamente e "em branco" são as não respondidas. Exemplo: 30 acertos em 40 questões dão 75% e nota 7,5.

**Tempo:** o prazo (`data_limite`, em segundos inteiros) é definido no servidor ao criar o simulado e nunca pausa. `GET /simulados/:id` devolve `tempo_restante_ms`. Uma rotina do servidor, executada a cada 30 s, finaliza os simulados vencidos, inclusive quando o navegador está fechado.

**Um simulado por vez:** a criação roda numa transação que bloqueia a linha do usuário (`SELECT ... FOR UPDATE`). Requisições simultâneas criam apenas uma tentativa; as demais recebem 409.

## Desempenho (RF020–RF022)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/desempenho/resumo` | 👤 | Totais, médias, melhor resultado, evolução (últimos 20), desempenho por tema, questões respondidas e dias seguidos de estudo |
| GET | `/desempenho/ranking?curso_id=` | 👤 | Ranking pela média de aproveitamento (top 20 + a posição do usuário). Os nomes aparecem abreviados |

## Fórum (RF026–RF029)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/forum/topicos?busca=&pagina=` | 👤 | Lista de tópicos com contagem de respostas e curtidas |
| POST | `/forum/topicos` | 👤 | `{titulo, conteudo}` |
| GET | `/forum/topicos/:id` | 👤 | Tópico com as respostas |
| DELETE | `/forum/topicos/:id` | 👤 | Somente o autor ou o admin |
| POST | `/forum/topicos/:id/respostas` | 👤 | `{conteudo}` |
| DELETE | `/forum/respostas/:id` | 👤 | Somente o autor ou o admin |
| POST | `/forum/topicos/:id/curtir` · `/forum/respostas/:id/curtir` | 👤 | Curte ou descurte → `{curtido, curtidas}` |
| POST | `/forum/denuncias` | 👤 | `{tipo: "topico" \| "resposta" \| "comentario", id, motivo}` |

## Administração (RF029–RF033)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/admin/usuarios?busca=&perfil=` | 🛡 | Lista de usuários |
| PATCH | `/admin/usuarios/:id` | 🛡 | `{perfil?, bloqueado?}`. O bloqueio encerra as sessões na hora |
| GET | `/admin/denuncias?status=` | 🛡 | Fila de moderação |
| PATCH | `/admin/denuncias/:id` | 🛡 | `{status: "procedente" \| "improcedente"}`. Se procedente, o conteúdo é ocultado (comentários de questão são removidos) |
| GET | `/admin/relatorios` | 🛡 | Uso, desempenho médio (geral e por curso), acessos dos últimos 14 dias e números do fórum |
| GET/POST | `/admin/simulados-oficiais` | 🛡 | Lista e cria: `{nome, descricao?, curso_id?, tempo_minutos, questao_ids: [..]}` |
| PATCH | `/admin/simulados-oficiais/:id` | 🛡 | `{ativo}` |

## Rotas de diagnóstico (da estrutura inicial)

- `GET /` → `{ mensagem: "API do ENAHub funcionando!" }`
- `GET /teste-db` → testa a conexão com o MySQL
