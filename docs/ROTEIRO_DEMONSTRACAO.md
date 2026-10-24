# Roteiro de demonstração do ENAHub (≈ 12 minutos)

## Antes da apresentação (30 min antes)

1. Inicie o MySQL: `brew services start mysql`
2. Volte o banco ao estado inicial da demonstração. Isso **apaga o banco `enahub`**; faça backup antes se houver algo importante nele:
   ```bash
   mysqldump -u enahub_app -p --no-tablespaces enahub > ~/backup_enahub_$(date +%Y%m%d).sql
   mysql -u enahub_app -p -e "DROP DATABASE enahub"
   cd backend && npm run db:setup
   ```
3. Abra dois terminais:
   - `cd backend && npm start` (confira `http://localhost:3000/teste-db`)
   - `cd frontend && npm run dev` (abra `http://localhost:5173`)
4. Deixe abertas duas janelas: uma normal (aluno) e uma anônima (admin), já com a tela de login.
5. Plano B: se algo falhar ao vivo, mostre a saída de `cd backend && npm test` (51 testes) e as screenshots geradas por `cd e2e && npm run jornada`.

Senha de todas as contas de demonstração: `Enahub@2026`

## Roteiro

### 1. Apresentação (1 min)
- Problema: estudar para o ENADE com materiais espalhados e sem acompanhar a evolução.
- Arquitetura cliente-servidor em três camadas: React + Bootstrap → API REST em Express → MySQL.

### 2. Cadastro e login (2 min): RF001, RF002, RNF009
1. Clique em **Criar conta** e depois em **Cadastrar** com o formulário vazio: aparecem as validações.
2. Preencha nome, e-mail, uma senha fraca (para mostrar a regra) e depois uma senha forte. Escolha o curso ADS, a instituição UNIFOR e aceite os termos.
3. Você cai no **Início** (wireframe 10.3) com a mensagem "Conta criada com sucesso!".
4. Ponto a destacar: a senha é guardada com hash `scrypt`, e todo cadastro novo é sempre do perfil aluno.

### 3. Banco de questões (2 min): RF007–RF012
1. Abra **Questões** e filtre por curso ADS e dificuldade "Média". Pesquise "SQL".
2. Mostre o selo **"Demonstrativa"**: as questões foram elaboradas pela equipe e não são oficiais do ENADE.
3. Favorite uma questão com a ★. Clique em **Visualizar**, marque uma alternativa e clique em **Responder** (modo prática com explicação).

### 4. Simulado (3 min): RF013–RF018
1. Em **Simulados**, escolha 5 questões e 10 minutos, filtrando por ADS, e clique em **Iniciar simulado**.
2. Responda 2 ou 3 questões. Aponte o "✓ Resposta salva", que indica que cada clique já foi gravado no MySQL.
3. **Recarregue a página (F5):** as respostas continuam marcadas e o cronômetro **não reinicia**, porque o prazo é controlado pelo servidor e não existe pausa.
4. Clique em **Finalizar Simulado**. O modal avisa quantas questões ficarão em branco. Confirme.

### 5. Resultado e gabarito (2 min): RF019, RF023–RF025
1. A tela de resultado (wireframe 10.6) mostra nota de 0 a 10, acertos, erros, em branco, aproveitamento e desempenho por tema.
2. Explique a regra de cálculo: nota = acertos ÷ total × 10. Exemplo: 30 de 40 dá 75% e nota 7,5.
3. Clique em **Ver Gabarito Comentado** e filtre por "Erradas". A resposta do aluno aparece em vermelho, a correta em verde, junto com a explicação do professor.
4. Comente: o gabarito só é enviado ao navegador depois da finalização, e finalizar duas vezes não gera um segundo resultado (há teste automatizado para isso).

### 6. Desempenho e fórum (1 min): RF020–RF022, RF026–RF029
1. Em **Desempenho**, mostre o gráfico de evolução, o desempenho por tema, o histórico e o ranking.
2. No **Fórum**, crie um tópico, responda e curta a resposta.

### 7. Administração (1 min): RF030–RF033
1. Na janela anônima, entre como `admin@enahub.demo` e abra **Administração**.
2. Percorra as abas: questões pendentes (aprovar/rejeitar), usuários (perfil e bloqueio), denúncias, simulados oficiais e relatórios (uso, desempenho médio, acessos).

### 8. Qualidade e encerramento (1 min)
- Mostre `npm test`: 51 testes, incluindo tempo esgotado, finalização simultânea e migração de dados.
- Mostre a responsividade: abra o DevTools no modo celular.
- Pendências conhecidas, para ser transparente: envio real de e-mail na recuperação de senha, upload de mídia (hoje é por URL), teste de carga e hospedagem 24/7.

## Perguntas prováveis

- **"E se o aluno fechar o navegador no meio do simulado?"** O prazo fica gravado no banco. Uma rotina do servidor, executada a cada 30 s, finaliza o simulado vencido e calcula a nota com as respostas já salvas.
- **"O aluno consegue ver a resposta pelo DevTools?"** Não. Durante o simulado, a API não envia o campo `correta`, e o modo prática fica bloqueado para as questões do simulado em andamento.
- **"Por que tem um simulado oficial?"** É o RF032: o administrador monta um simulado fixo, que todos os alunos fazem com as mesmas questões.
- **"As questões são do ENADE?"** As da demonstração não. Elas foram elaboradas pela equipe e estão identificadas como tal. O sistema permite cadastrar questões oficiais com ano e fonte.
