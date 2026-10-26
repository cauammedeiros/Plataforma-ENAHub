# Roteiro de demonstração do ENAHub (≈ 15 minutos)

Tudo o que aparece neste roteiro é funcionalidade real, com dados lidos e gravados no MySQL. As 32 questões da seed são **demonstrativas** (elaboradas pela equipe, não oficiais do ENADE), e isso deve ser dito ao mostrá-las.

Senha de todas as contas de demonstração **locais**: `Enahub@2026`. As contas são `aluno@`, `professor@` e `admin@enahub.demo`. Na **versão online** (https://plataforma-enahub.vercel.app), as mesmas contas usam a senha privada guardada pelo responsável pelo projeto (`docs/HOSPEDAGEM.md`).

## Preparação (na véspera e 30 minutos antes)

**Na véspera**
1. `git pull` na branch combinada, `npm install` em `backend/` e em `frontend/`.
2. Em `backend/`, rode `npm test` (todos os testes devem passar no MySQL da máquina da apresentação).
3. Gere as evidências para o plano B: com os servidores rodando, `cd e2e && npm install && npm run jornada && npm run gestao`. As screenshots ficam em `e2e/shots/`. Depois, volte o banco ao estado inicial (passo 2 abaixo), porque os roteiros criam dados de teste.

4. **Versão online:** abra https://plataforma-enahub.vercel.app e faça login. Se der erro de conexão, o banco gratuito da Aiven pode ter sido desligado por falta de uso: console.aiven.io → `enahub-mysql` → **Power on** e espere alguns minutos.

**30 minutos antes**
1. Inicie o MySQL: `brew services start mysql` no macOS, ou o serviço "MySQL80" no Windows.
2. Banco limpo. **Isso apaga o banco `enahub`**, então faça o backup antes:
   ```bash
   mysqldump -u enahub_app -p --no-tablespaces enahub > backup_enahub_antes_apresentacao.sql
   mysql -u enahub_app -p -e "DROP DATABASE enahub"
   cd backend && npm run db:setup
   ```
3. Para mostrar a recuperação de senha na tela, coloque `RECUPERACAO_LINK_NA_RESPOSTA=true` no `backend/.env`. Esta é **somente a máquina local**; sem a opção, o link aparece no terminal.
4. Terminal 1: `cd backend && npm start`. Confira `http://localhost:3000/teste-db`.
5. Terminal 2: `cd frontend && npm run dev` e abra `http://localhost:5173`.
6. Terminal 3: deixe aberto `mysql -u enahub_app -p enahub` para a etapa 11.
7. Navegador: uma janela normal (aluno) e uma anônima/privada (professor e depois admin), ambas na tela de login.

## Sequência da apresentação

### 1. Apresentação do ENAHub (1 min)
- O problema: preparação para o ENADE com materiais dispersos e sem acompanhamento da evolução.
- O público: estudantes de ADS, Administração e Direito, entre outros.
- Os três perfis: aluno, professor e administrador.

### 2. Arquitetura e tecnologias (1 min)
- Cliente-servidor em três camadas: **React + Bootstrap** → API REST em **Node.js/Express** → **MySQL**.
- O back-end segue a separação rotas → controllers → services → banco; migrations e seeds versionados.
- Segurança: senha com hash `scrypt`, sessão com token cujo hash fica no banco, permissões verificadas no servidor.

### 3. Cadastro e autenticação (2 min): RF001–RF003
1. Clique em **Criar conta** e em **Cadastrar** com o formulário vazio: aparecem as mensagens de validação.
2. Preencha os dados (curso ADS, instituição UNIFOR, aceite dos termos). Você entra no **Início**, com saudação pelo nome e os indicadores em "Nenhum ainda / 0 / Sem atividade ainda", porque são dados reais de uma conta nova.
3. Clique em **Sair** e tente acessar `/desempenho`: o sistema redireciona ao login.
4. (Opcional) **Esqueci minha senha**: o link de uso único aparece na tela (modo demonstração). Explique que o envio real por e-mail é uma pendência documentada.

### 4. Banco de questões (2 min): RF007–RF012
1. Entre como `aluno@enahub.demo` e abra **Questões**.
2. Filtre por curso ADS e dificuldade "Média", e pesquise "SQL". Mostre que o filtro fica na URL.
3. Mostre o selo **Demonstrativa**.
4. Favorite uma questão (★), clique em **Visualizar**, responda no modo prática e veja a explicação.

### 5. Configuração do simulado (1 min): RF013–RF015
1. Em **Simulados**, escolha 5 questões e 10 minutos, com o curso ADS.
2. Mostre também o **simulado oficial** criado pela administração (RF032).
3. Clique em **Iniciar simulado**.

### 6. Resolução das questões (2 min): RF016–RF018
1. Responda 3 questões. A cada clique aparece "✓ Resposta salva".
2. **Pressione F5:** as respostas continuam marcadas e o cronômetro segue de onde estava, porque o prazo está no servidor e não há pausa.
3. Mostre a grade de navegação entre questões.
4. Clique em **Finalizar Simulado**. O modal avisa quantas questões ficarão em branco. Confirme.

### 7. Resultado e gabarito (2 min): RF019, RF023–RF025
1. Mostre nota (0 a 10), acertos, erros, em branco, aproveitamento e desempenho por tema.
2. Explique a regra: nota = acertos ÷ total × 10. Exemplo: 30 de 40 dá 75% e nota 7,5.
3. **Ver Gabarito Comentado**, filtro "Erradas": a resposta do aluno aparece em vermelho, a correta em verde, junto com a explicação.

### 8. Dashboard de desempenho (1 min): RF020–RF022
1. Volte ao **Início**: o último simulado, as questões respondidas e os dias seguidos já refletem a tentativa.
2. Em **Desempenho**: gráfico de evolução (passe o mouse; há também a versão em tabela), desempenho por tema, histórico e ranking.

### 9. Funcionalidades do professor (1,5 min): RF006, RF010, RF024, RF031
1. Na janela anônima, entre como `professor@enahub.demo` e abra **Gestão** → **+ Nova questão**.
2. Preencha curso, tema, ano, dificuldade e as 5 alternativas, e marque a correta. Ao salvar, a questão fica **Pendente**.
3. Abra uma questão publicada de outro autor e adicione um comentário explicativo.
4. Mostre que o professor **não** vê o menu Administração. Se tentar acessar `/admin/relatorios` pela API, recebe 403.

### 10. Administração (1,5 min): RF029–RF033
1. Saia e entre como `admin@enahub.demo` → **Administração**.
2. **Questões:** aprove a questão do professor. No aluno, ela passa a aparecer no banco.
3. **Usuários:** perfil e bloqueio (o bloqueio derruba a sessão na hora).
4. **Denúncias**, **Simulados oficiais**, **Categorias** e **Relatórios** (uso, desempenho médio por curso e acessos).

### 11. Persistência no MySQL (1 min)
No Terminal 3, mostre os dados gravados pelo simulado feito na etapa 6:
```sql
SELECT id, status, finalizado_por, acertos, erros, em_branco, percentual, nota
  FROM simulados ORDER BY id DESC LIMIT 1;

SELECT sq.ordem, r.alternativa_id, a.letra, a.correta, sq.acertou
  FROM simulado_questoes sq
  LEFT JOIN respostas r ON r.simulado_id = sq.simulado_id AND r.questao_id = sq.questao_id
  LEFT JOIN alternativas a ON a.id = r.alternativa_id
 WHERE sq.simulado_id = (SELECT MAX(id) FROM simulados) ORDER BY sq.ordem;

SELECT email, LEFT(senha, 7) AS inicio_do_hash FROM usuarios LIMIT 3;   -- senhas não ficam em texto puro
```

### 12. Considerações finais (1 min)
- Qualidade: mostre a saída de `npm test` (testes de cálculo, tempo esgotado, finalização simultânea, permissões e migração de dados) e cite os roteiros E2E.
- Responsividade: DevTools no modo celular ou no próprio telefone.
- Pendências, com transparência: envio real de e-mail (RF003), upload de mídia (RF025, hoje por URL), teste de carga com 1.000 usuários (RNF002/008/010), garantia de funcionamento 24/7 (RNF004: a versão online usa planos gratuitos, sem SLA) e avisos aos usuários (caso de uso).

## Plano B

| Problema | O que fazer |
|---|---|
| **Sem internet** | Use a versão local: o ENAHub roda inteiro em `localhost` e não carrega recursos externos. Só é preciso ter feito o `npm install` antes |
| **Site online fora do ar** (Aiven desligado, cota esgotada) | Religue o serviço no console da Aiven (**Power on**) ou apresente a versão local |
| **MySQL não inicia** | `brew services restart mysql` (macOS) ou reinicie o serviço MySQL80 (Windows). Se o banco estiver corrompido, recrie com `npm run db:setup` ou restaure o backup: `mysql -u enahub_app -p enahub < backup.sql` |
| **Porta 3000 ocupada** | `PORT=3001` no `backend/.env` e `VITE_API_PROXY=http://localhost:3001` em `frontend/.env.local`, depois reinicie |
| **Login bloqueado por tentativas** | Reinicie o back-end (o limite fica em memória) |
| **Simulado em andamento atrapalha a demonstração** | Finalize-o pela tela, ou abra-o e clique em **Finalizar Simulado** |
| **Notebook falha** | Tenha o projeto clonado e testado no computador de outro integrante; leve as screenshots de `e2e/shots/` e a saída de `npm test` |
| **Nada funciona** | Apresente pelas screenshots de `e2e/shots/` na ordem do roteiro, mais `docs/TESTES.md` e `docs/REQUISITOS.md` |

## Perguntas prováveis

- **"E se o aluno fechar o navegador no meio do simulado?"** O prazo está no banco. Uma rotina do servidor, executada a cada 30 s, finaliza o simulado vencido com as respostas já salvas.
- **"O aluno consegue ver a resposta pelo DevTools?"** Não. Durante o simulado, a API não envia o campo `correta`, e o modo prática fica bloqueado para as questões do simulado em andamento.
- **"E se clicar duas vezes em finalizar, ou abrir dois simulados em abas diferentes?"** A finalização é idempotente, e a criação bloqueia a linha do usuário no banco. Os dois casos têm teste automatizado com requisições simultâneas.
- **"As questões são do ENADE?"** As da demonstração não. Elas foram elaboradas pela equipe e identificadas como tal. O sistema permite cadastrar questões oficiais com ano e fonte.
- **"Por que não mostrar o e-mail de recuperação?"** Falta configurar um servidor SMTP. O fluxo (token de uso único com validade de 30 min) está implementado e testado; a limitação está documentada.
