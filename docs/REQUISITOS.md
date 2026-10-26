# Matriz de requisitos do ENAHub

Fontes: `PlanoDeTrabalho (2).pdf` (seções 8, 9, 10 e 11), `Requisitos.docx` e `SlideEnahub.pdf`.
Situação na branch `feat/enahub-mvp-03nov`, revisada em 24/10/2026.

**Situação:** ✅ concluído (funciona de ponta a ponta e tem evidência) · ⚠️ parcial · ❌ pendente · ❔ não verificado (implementado, mas a meta não foi medida)

**Evidência:** **U** = teste unitário · **I** = teste de integração da API (`backend/tests`) · **E2E** = roteiro no navegador (`e2e/jornada.js`, `e2e/gestao.js`). Os resultados estão em `docs/TESTES.md`.

Abreviações de caminhos: `be/` = `backend/src/` · `fe/` = `frontend/src/`

## Resumo

| Grupo | Concluídos | Parciais | Pendentes | Não verificados |
|---|---|---|---|---|
| Requisitos funcionais (RF001–RF033 + RF005.1 = 34) | 32 | 2 (RF003, RF025) | 0 | 0 |
| Requisitos não funcionais (RNF001–RNF010 + RNF003.1/.2 = 12) | 7 | 3 (RNF003, RNF004, RNF010) | 0 | 2 (RNF002, RNF008) |
| Casos de uso fora da lista RF (diagrama, seção 11: 6 itens) | 3 | 1 | 2 | 0 |

## Requisitos funcionais

### Gestão de usuários

| Código | Descrição | Implementação | Arquivos | Evidência | Situação | Observações |
|---|---|---|---|---|---|---|
| RF001 | Cadastro com nome, e-mail, senha, curso e instituição | `POST /api/auth/cadastro`; tela Cadastro | `be/services/auth.service.js`, `be/controllers/auth.controller.js`, `fe/pages/Cadastro.jsx` | I, E2E | ✅ | Validação no cliente e no servidor; e-mail único (sem diferenciar maiúsculas); confirmação de conta criada; o perfil é sempre aluno |
| RF002 | Login por e-mail e senha | `POST /api/auth/login`; tela Login | `be/services/auth.service.js`, `be/middlewares/auth.js`, `fe/pages/Login.jsx` | I, E2E | ✅ | Feedback para campos vazios, credenciais inválidas e sucesso; mesma mensagem para e-mail inexistente e senha errada |
| RF003 | Recuperação de senha por link enviado por e-mail | `/api/auth/esqueci-senha` e `/api/auth/redefinir-senha`; telas | `be/services/auth.service.js`, `fe/pages/EsqueciSenha.jsx`, `fe/pages/RedefinirSenha.jsx` | I | ⚠️ | Link de uso único válido por 30 min; um novo pedido invalida os anteriores; a redefinição encerra as sessões. **Não há envio real de e-mail (sem SMTP):** o link aparece no terminal do back-end e, se habilitado explicitamente em ambiente local, na tela |
| RF004 | Editar nome, senha, curso e instituição; acesso a favoritos e histórico | `PUT /api/usuarios/me`; tela Perfil (com atalhos) | `be/services/usuarios.service.js`, `fe/pages/Perfil.jsx` | I, E2E | ✅ | A troca de senha exige a senha atual |
| RF005 | Exclusão de conta com confirmação de segurança | `DELETE /api/usuarios/me`; modal | `be/services/usuarios.service.js`, `fe/pages/Perfil.jsx` | I | ✅ | Exige a senha e a digitação de "EXCLUIR"; exclusão em cascata; o único admin não pode se excluir |
| RF005.1 | Feedback das operações | Toasts, alertas e mensagens por campo | `fe/contexts/ToastProvider.jsx`, `fe/components/Campo.jsx`, `fe/components/Alerta.jsx` | E2E | ✅ | |

### Banco de questões

| Código | Descrição | Implementação | Arquivos | Evidência | Situação | Observações |
|---|---|---|---|---|---|---|
| RF006 | Cadastro de questões por admins e professores autorizados | `POST /api/questoes` (perfis professor e admin) | `be/services/questoes.service.js`, `be/routes/questoes.routes.js`, `fe/pages/QuestaoForm.jsx` | I, E2E | ✅ | Questão de professor fica pendente; questão do admin é publicada direto. Aluno recebe 403 |
| RF007 | Classificação por curso | `questoes.curso_id` + aba Categorias | `database/migrations/002_*.sql`, `fe/pages/Admin.jsx` | I, E2E | ✅ | Seed com ADS, Administração e Direito; o admin pode cadastrar novos cursos |
| RF008 | Classificação por ano (2010 até o mais recente) | `questoes.ano`, validado entre 2010 e o ano atual | `be/controllers/questoes.controller.js` | I, E2E | ✅ | As questões da seed **não são oficiais**: o ano é apenas referência e isso está identificado na tela |
| RF009 | Classificação por área/tema de cada curso | Tabela `temas` ligada ao curso | `002_*.sql`, `be/services/catalogo.service.js` | I, E2E | ✅ | |
| RF010 | Dificuldade definida por admins e professores | `questoes.dificuldade` | `be/services/questoes.service.js` | I, E2E | ✅ | |
| RF011 | Pesquisa e filtros (curso, ano, tema, dificuldade) | `GET /api/questoes`; tela Banco de Questões | `be/services/questoes.service.js`, `fe/pages/BancoQuestoes.jsx`, `fe/components/FiltrosQuestoes.jsx` | I, E2E | ✅ | Filtros ficam na URL; paginação |
| RF012 | Favoritar questões e acessá-las pelo perfil | `/api/questoes/:id/favorito`; tela Favoritas | `be/services/favoritos.service.js`, `fe/pages/Favoritas.jsx` | I, E2E | ✅ | |

### Simulados

| Código | Descrição | Implementação | Arquivos | Evidência | Situação | Observações |
|---|---|---|---|---|---|---|
| RF013 | Geração automática de simulados | Sorteio entre questões aprovadas | `be/services/simulados.service.js` (`sortearQuestoes`) | I, E2E | ✅ | Questões sem repetição |
| RF014 | Escolha da quantidade de questões | De 1 a 80, com filtros opcionais | `be/controllers/simulados.controller.js`, `fe/pages/Simulados.jsx` | I, E2E | ✅ | Retorna 422 informando quantas questões estão disponíveis |
| RF015 | Tempo configurável | De 5 a 300 minutos | idem | I, E2E | ✅ | |
| RF016 | Impedir pausa | `data_limite` fixada no servidor na criação | `be/services/simulados.service.js`, `fe/pages/SimuladoExecucao.jsx` | I, E2E | ✅ | Recarregar a página não reinicia nem pausa o tempo |
| RF017 | Finalização automática ao fim do tempo | Cronômetro do navegador + verificação do servidor a cada 30 s + checagem em cada requisição | `be/server.js`, `be/services/simulados.service.js` (`finalizarExpirados`) | I, E2E | ✅ | Funciona com o navegador fechado; registra `finalizado_por = tempo` |
| RF018 | Salvamento automático das respostas | `PUT /api/simulados/:id/respostas/:questaoId` a cada clique | idem | I, E2E | ✅ | Respostas persistem no MySQL; vale a última resposta escolhida |

### Desempenho e gabarito

| Código | Descrição | Implementação | Arquivos | Evidência | Situação | Observações |
|---|---|---|---|---|---|---|
| RF019 | Resultado: nota, acertos, erros e percentual | `GET /api/simulados/:id/resultado`; tela Resultado | `be/utils/pontuacao.js`, `be/services/simulados.service.js`, `fe/pages/Resultado.jsx` | U, I, E2E | ✅ | Também mostra questões em branco e desempenho por tema. Finalização idempotente (também com chamadas simultâneas) |
| RF020 | Histórico de simulados | `GET /api/simulados`; tela Desempenho | `fe/pages/Desempenho.jsx` | I, E2E | ✅ | |
| RF021 | Estatísticas: evolução, média e desempenho por tema | `GET /api/desempenho/resumo` | `be/services/desempenho.service.js`, `fe/components/GraficoEvolucao.jsx` | I, E2E | ✅ | O gráfico também pode ser visto como tabela |
| RF022 | Ranking geral | `GET /api/desempenho/ranking` | `be/services/desempenho.service.js` | I, E2E | ✅ | Filtro por curso; nomes abreviados (privacidade) |
| RF023 | Gabarito após o simulado | Resultado → Gabarito comentado | `be/services/simulados.service.js` (`resultado`) | I, E2E | ✅ | Retorna 409 antes da finalização; o campo `correta` nunca é enviado ao aluno antes do fim |
| RF024 | Comentários de professores e administradores | `POST /api/questoes/:id/comentarios` | `be/services/questoes.service.js`, `fe/pages/QuestaoDetalhe.jsx` | I, E2E | ✅ | O professor comenta qualquer questão publicada |
| RF025 | Explicações com texto, imagem e vídeo | Texto + URL de imagem + URL de vídeo | `fe/components/Comentarios.jsx`, `be/utils/validacao.js` (`url`) | I | ⚠️ | Imagem e vídeo **apenas por link** (somente http/https, validado); **sem upload de arquivos**. O vídeo abre em nova aba |

### Fórum

| Código | Descrição | Implementação | Arquivos | Evidência | Situação | Observações |
|---|---|---|---|---|---|---|
| RF026 | Qualquer usuário cria tópicos | `POST /api/forum/topicos` | `be/services/forum.service.js`, `fe/pages/Forum.jsx` | I, E2E | ✅ | |
| RF027 | Responder tópicos sem limite | `POST /api/forum/topicos/:id/respostas` | `fe/pages/Topico.jsx` | I, E2E | ✅ | |
| RF028 | Curtir respostas | `POST /api/forum/respostas/:id/curtir` | `fe/components/BotaoCurtir.jsx` | I, E2E | ✅ | Também é possível curtir tópicos, como mostra o wireframe 10.7 |
| RF029 | Denunciar conteúdo; o administrador analisa | `POST /api/forum/denuncias`; aba Denúncias | `be/services/forum.service.js`, `be/services/admin.service.js`, `fe/components/BotaoDenunciar.jsx` | I, E2E | ✅ | Tópicos, respostas e comentários de questão. Denúncia procedente oculta ou remove o conteúdo |

### Administração

| Código | Descrição | Implementação | Arquivos | Evidência | Situação | Observações |
|---|---|---|---|---|---|---|
| RF030 | Gerenciar usuários e bloquear contas | Aba Usuários (perfil e bloqueio) | `be/services/admin.service.js`, `fe/pages/Admin.jsx` | I, E2E | ✅ | O bloqueio encerra as sessões na hora; o admin não pode bloquear a si mesmo |
| RF031 | Aprovação de questões antes da publicação | Status pendente/aprovada/rejeitada/arquivada | `be/services/questoes.service.js` | I, E2E | ✅ | Edição feita por professor volta para aprovação |
| RF032 | Criar e gerenciar simulados oficiais | Aba Simulados oficiais | `be/services/simulados.service.js` (`criarModelo`) | I, E2E | ✅ | Permite criar, ativar e desativar; não é possível editar a lista de questões de um simulado já criado |
| RF033 | Relatórios: uso, desempenho médio e acessos | Aba Relatórios | `be/services/admin.service.js` (`relatorios`) | I, E2E | ✅ | "Acessos" = logins e cadastros registrados na tabela `acessos` |

## Requisitos não funcionais

| Código | Descrição | Implementação / evidência | Situação | Observações |
|---|---|---|---|---|
| RNF001 | Interface simples, moderna e intuitiva | Fiel aos wireframes 10.1–10.7; estados de carregamento, vazio e erro; avaliação do responsável pelo projeto no Safari | ✅ | Não houve teste formal de usabilidade com usuários |
| RNF002 | Resposta em até 3 s com 1.000 usuários simultâneos | Medição local com **1 usuário**: 3–10 ms por endpoint | ❔ | **Não foi feito teste de carga.** Não é possível afirmar conformidade |
| RNF003 | Armazenamento seguro conforme a LGPD | Hash de senha, mínimo de dados, ranking com nome abreviado, logs sem SQL/valores, exclusão de conta | ⚠️ | Sem HTTPS nem infraestrutura de produção (execução apenas local); sem revisão jurídica |
| RNF003.1 | Exclusão de dados e da conta | RF005 | ✅ | |
| RNF003.2 | Política de privacidade e termos de uso | `fe/pages/Termos.jsx`; aceite obrigatório no cadastro | ✅ | Texto acadêmico, sem valor jurídico |
| RNF004 | Disponibilidade 24/7 | Hospedagem gratuita de demonstração em https://plataforma-enahub.vercel.app (Vercel Hobby + Aiven MySQL Free), `docs/HOSPEDAGEM.md` | ⚠️ | Acessível pela internet, mas **sem garantia de 24/7**: planos gratuitos sem SLA, e o banco é desligado se ficar sem uso. Também roda localmente (`docs/INSTALACAO.md`) |
| RNF005 | Responsividade (celular como acesso principal) | Bootstrap; E2E em 390×844 sem rolagem horizontal | ✅ | Verificado no Chrome. Safari (inclusive iOS) foi avaliado só visualmente pelo responsável, sem roteiro automatizado |
| RNF006 | Navegação fluida | SPA com React Router | ✅ | |
| RNF007 | Componentes reutilizáveis | `fe/components/` (Campo, Modal, Alternativas, InfoQuestao, BarraPercentual, Icone...) | ✅ | |
| RNF008 | Busca de questões em até 3 s | Índices `idx_questoes_filtros`/`idx_questoes_tema`; cerca de 8 ms localmente | ❔ | Sem teste de carga |
| RNF009 | Hash seguro de senhas | `scrypt` com salt aleatório (`be/utils/senha.js`) | ✅ | Teste U verifica salt e verificação |
| RNF010 | Back-end escalável | API sem estado em memória (sessões no MySQL), pool de conexões, índices | ⚠️ | O limitador de tentativas é em memória (vale por instância); sem teste de carga |

## Casos de uso do diagrama (seção 11) que não estão na lista RF

| Caso de uso | Ator | Situação | Observações |
|---|---|---|---|
| Gerenciar categorias | Administrador | ⚠️ | Aba Categorias cadastra cursos e temas (com bloqueio de duplicados); não há edição nem exclusão |
| Aprovar professores / Controlar permissões | Administrador | ✅ | O admin altera o perfil do usuário (aluno → professor/admin) na aba Usuários |
| Moderar fórum / Gerenciar denúncias | Administrador | ✅ | RF029 |
| Editar nível de dificuldade | Administrador | ✅ | Edição de questão |
| Enviar avisos aos usuários | Administrador | ❌ | Não implementado (não consta na lista RF001–RF033) |
| Enviar e-mail de recuperação | Usuário (include de "Recuperar a senha") | ❌ | Mesmo motivo do RF003 parcial (sem SMTP) |
