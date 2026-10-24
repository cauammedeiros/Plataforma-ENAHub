# Matriz de requisitos do ENAHub

Fontes: `PlanoDeTrabalho (2).pdf`, `Requisitos.docx` e `SlideEnahub.pdf`. Situação na branch `feat/enahub-mvp-03nov` em 24/10/2026.

Legenda: ✅ implementado e testado · ⚠️ parcial (veja a observação) · ❌ não implementado

"Testes" indica onde o requisito é verificado: **U** = unitário, **I** = integração da API (`backend/tests`) e **E2E** = jornada no navegador (descrita em `docs/TESTES.md`).

## Requisitos funcionais

| Req. | Descrição | Status | Implementação | Testes | Observação |
|---|---|---|---|---|---|
| RF001 | Cadastro (nome, e-mail, senha, curso, instituição) | ✅ | `POST /auth/cadastro`, tela Cadastro | I, E2E | E-mail único; aceite dos termos obrigatório; a instituição é criada se ainda não existir |
| RF002 | Login por e-mail e senha | ✅ | `POST /auth/login`, tela Login | I, E2E | Feedback para campos vazios, dados inválidos e sucesso |
| RF003 | Recuperação de senha por link | ⚠️ | `/auth/esqueci-senha`, `/auth/redefinir-senha`, telas | I | Link de uso único válido por 30 min. **Não há envio real de e-mail** (falta configurar SMTP): em desenvolvimento, o link aparece no console do back-end e na própria tela |
| RF004 | Edição de perfil (nome, senha, curso, instituição) | ✅ | `PUT /usuarios/me`, tela Perfil | I, E2E | A troca de senha exige a senha atual e encerra as outras sessões |
| RF005 | Exclusão de conta com confirmação | ✅ | `DELETE /usuarios/me`, modal no Perfil | I | Exige a senha e a digitação de "EXCLUIR"; os dados vinculados são removidos em cascata |
| RF005.1 | Feedback das operações | ✅ | Toasts, alertas e validação por campo | E2E | |
| RF006 | Cadastro de questões por professores e administradores | ✅ | `POST /questoes`, tela Nova questão | I, E2E | Questão de professor fica pendente; questão do admin já é publicada |
| RF007 | Classificação por curso | ✅ | `questoes.curso_id` | I, E2E | Seed com ADS, Administração e Direito |
| RF008 | Classificação por ano (2010 até o mais recente) | ✅ | `questoes.ano` (validado entre 2010 e o ano atual) | I, E2E | As questões da seed **não são oficiais**: o ano é só referência |
| RF009 | Classificação por área/tema | ✅ | Tabela `temas`, ligada ao curso | I, E2E | |
| RF010 | Classificação por dificuldade | ✅ | `questoes.dificuldade` (fácil/média/difícil) | I, E2E | Definida por professor ou admin |
| RF011 | Pesquisa e filtros (curso, ano, tema, dificuldade) | ✅ | `GET /questoes`, tela Banco de Questões | I, E2E | Filtros ficam na URL; resultado paginado |
| RF012 | Favoritar questões | ✅ | `/questoes/:id/favorito`, tela Favoritas | I, E2E | |
| RF013 | Geração automática de simulado | ✅ | `POST /simulados` (sorteio entre questões aprovadas) | I, E2E | |
| RF014 | Simulado personalizado (quantidade) | ✅ | Quantidade de 1 a 80, com filtros opcionais | I, E2E | Retorna 422 quando não há questões suficientes |
| RF015 | Tempo configurável | ✅ | De 5 a 300 minutos | I, E2E | |
| RF016 | Sem pausa | ✅ | Prazo (`data_limite`) fixado no servidor | I, E2E | Recarregar a página não reinicia o tempo |
| RF017 | Finalização automática | ✅ | Cronômetro do navegador + verificação do servidor a cada 30 s + checagem em cada requisição | I, E2E | Funciona mesmo com o navegador fechado |
| RF018 | Salvamento automático | ✅ | `PUT /simulados/:id/respostas/:questaoId` a cada clique | I, E2E | As respostas persistem no MySQL após recarregar |
| RF019 | Resultado (nota, acertos, erros, percentual) | ✅ | `GET /simulados/:id/resultado`, tela Resultado | U, I, E2E | Também mostra em branco, desempenho por tema e comparação. A finalização é idempotente |
| RF020 | Histórico de simulados | ✅ | `GET /simulados`, tela Desempenho | I, E2E | |
| RF021 | Estatísticas (evolução, média, por tema) | ✅ | `GET /desempenho/resumo`, gráfico e barras | I, E2E | |
| RF022 | Ranking geral | ✅ | `GET /desempenho/ranking` | I, E2E | Filtro "somente meu curso"; nomes abreviados (privacidade) |
| RF023 | Gabarito após o simulado | ✅ | Resultado → "Ver Gabarito Comentado" | I, E2E | Retorna 409 antes da finalização |
| RF024 | Comentários de professores e admins | ✅ | `POST /questoes/:id/comentarios` | I | |
| RF025 | Explicações com texto, imagem e vídeo | ⚠️ | Texto + URL de imagem + URL de vídeo | I | Imagem e vídeo são **por link (URL)**; não há upload de arquivos. O vídeo abre em nova aba |
| RF026 | Criar tópicos | ✅ | `POST /forum/topicos`, tela Fórum | I, E2E | |
| RF027 | Responder tópicos sem limite | ✅ | `POST /forum/topicos/:id/respostas` | I, E2E | |
| RF028 | Curtir respostas | ✅ | Curtidas em respostas e também em tópicos (wireframe 10.7) | I, E2E | |
| RF029 | Denunciar conteúdo; o administrador analisa | ✅ | `POST /forum/denuncias`, aba Denúncias | I, E2E | Tópicos e respostas pela interface; comentários de questão apenas pela API |
| RF030 | Gerenciar usuários e bloquear | ✅ | Aba Usuários (perfil e bloqueio) | I | O bloqueio encerra as sessões na hora |
| RF031 | Aprovação de questões antes de publicar | ✅ | Status pendente/aprovada/rejeitada/arquivada | I, E2E | |
| RF032 | Simulados oficiais | ✅ | Aba Simulados oficiais; o aluno inicia em Simulados | I, E2E | Permite criar, ativar e desativar; não é possível editar a lista de questões de um simulado já criado |
| RF033 | Relatórios (uso, desempenho médio, acessos) | ✅ | `GET /admin/relatorios`, aba Relatórios | I, E2E | "Acessos" = logins registrados (tabela `acessos`) |

## Requisitos não funcionais

| Req. | Descrição | Status | Observação |
|---|---|---|---|
| RNF001 | Interface simples, moderna e intuitiva | ✅ | Segue a identidade dos wireframes (grafite, cartões brancos), com estados de carregamento, vazio e erro |
| RNF002 | Resposta em até 3 s com 1.000 usuários | ⚠️ | Medido localmente com **1 usuário**: endpoints principais entre 3 e 10 ms. **Não foi feito teste de carga** com 1.000 usuários simultâneos |
| RNF003 | Proteção de dados (LGPD) | ⚠️ | Hash de senha, exclusão de conta, termos, nomes abreviados no ranking e mínimo de dados coletados. Sem HTTPS/infraestrutura de produção (fora do escopo local) |
| RNF003.1 | Exclusão de dados | ✅ | RF005 |
| RNF003.2 | Política de privacidade e termos | ✅ | Página `/termos` (texto acadêmico, sem revisão jurídica) |
| RNF004 | Disponibilidade 24/7 | ❌ | Depende de hospedagem; o projeto roda apenas localmente |
| RNF005 | Responsividade (mobile first) | ✅ | Testado em 390×844 sem rolagem horizontal (E2E) |
| RNF006 | Navegação fluida | ✅ | SPA com React Router |
| RNF007 | Componentes reutilizáveis | ✅ | `frontend/src/components` (Campo, Modal, Alternativas, InfoQuestao, BarraPercentual...) |
| RNF008 | Busca em até 3 s | ⚠️ | Local: cerca de 8 ms com índices. Sem teste de carga |
| RNF009 | Hash seguro de senhas | ✅ | `scrypt` com salt aleatório (`backend/src/utils/senha.js`) |
| RNF010 | Escalabilidade do back-end | ⚠️ | API sem estado em memória (sessões no MySQL), pool de conexões e índices. O limitador de tentativas é em memória, então vale por instância |
