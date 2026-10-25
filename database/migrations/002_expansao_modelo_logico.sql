-- 002 - Expansão do esquema conforme o Modelo Lógico do Plano de Trabalho (seção 12.2)
-- Mantém os nomes de tabela já usados pela equipe (plural, chave primária "id")
-- e migra os dados existentes antes de remover colunas antigas.

-- ---------------------------------------------------------------------------
-- Instituições e temas
-- ---------------------------------------------------------------------------
CREATE TABLE `instituicoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_instituicoes_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tema/área específica de um curso (RF009). curso_id NULL = tema de formação geral.
CREATE TABLE `temas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `curso_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_temas_curso_nome` (`curso_id`, `nome`),
  CONSTRAINT `fk_temas_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Usuários: perfil (aluno/professor/admin), instituição, bloqueio, auditoria
-- ---------------------------------------------------------------------------
ALTER TABLE `usuarios`
  ADD COLUMN `perfil` enum('aluno','professor','admin') NOT NULL DEFAULT 'aluno' AFTER `senha`,
  ADD COLUMN `instituicao_id` int DEFAULT NULL AFTER `curso_id`,
  ADD COLUMN `bloqueado` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN `aceitou_termos_em` datetime DEFAULT NULL,
  ADD COLUMN `ultimo_acesso` datetime DEFAULT NULL,
  ADD COLUMN `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN `atualizado_em` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  ADD KEY `idx_usuarios_instituicao` (`instituicao_id`),
  ADD CONSTRAINT `fk_usuarios_instituicao` FOREIGN KEY (`instituicao_id`) REFERENCES `instituicoes` (`id`) ON DELETE SET NULL;

-- Sessões de login (token opaco; o banco guarda apenas o hash SHA-256).
-- Logout = apagar a sessão; bloqueio/exclusão do usuário invalida todas.
CREATE TABLE `sessoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `token_hash` char(64) NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expira_em` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sessoes_token` (`token_hash`),
  KEY `idx_sessoes_usuario` (`usuario_id`),
  CONSTRAINT `fk_sessoes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Recuperação de senha (RF003): link com token de uso único e validade curta.
CREATE TABLE `tokens_recuperacao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expira_em` datetime NOT NULL,
  `usado_em` datetime DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tokens_recuperacao_token` (`token_hash`),
  CONSTRAINT `fk_tokens_recuperacao_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Registro de acessos (logins) para os relatórios administrativos (RF033).
CREATE TABLE `acessos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `data_acesso` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_acessos_data` (`data_acesso`),
  CONSTRAINT `fk_acessos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Questões: alternativas em tabela própria (alternativa_questao no modelo lógico)
-- ---------------------------------------------------------------------------
CREATE TABLE `alternativas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `questao_id` int NOT NULL,
  `letra` char(1) NOT NULL,
  `texto` text NOT NULL,
  `correta` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_alternativas_questao_letra` (`questao_id`, `letra`),
  CONSTRAINT `fk_alternativas_questao` FOREIGN KEY (`questao_id`) REFERENCES `questoes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Copia as alternativas que estavam em colunas da tabela questoes
INSERT INTO `alternativas` (`questao_id`, `letra`, `texto`, `correta`)
          SELECT `id`, 'A', `alternativa_a`, UPPER(`resposta_correta`) = 'A' FROM `questoes`
UNION ALL SELECT `id`, 'B', `alternativa_b`, UPPER(`resposta_correta`) = 'B' FROM `questoes`
UNION ALL SELECT `id`, 'C', `alternativa_c`, UPPER(`resposta_correta`) = 'C' FROM `questoes`
UNION ALL SELECT `id`, 'D', `alternativa_d`, UPPER(`resposta_correta`) = 'D' FROM `questoes`
UNION ALL SELECT `id`, 'E', `alternativa_e`, UPPER(`resposta_correta`) = 'E' FROM `questoes`;

ALTER TABLE `questoes`
  ADD COLUMN `ano` year DEFAULT NULL AFTER `enunciado`,
  ADD COLUMN `dificuldade` enum('facil','media','dificil') NOT NULL DEFAULT 'media' AFTER `ano`,
  ADD COLUMN `tema_id` int DEFAULT NULL AFTER `curso_id`,
  ADD COLUMN `oficial_enade` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN `fonte` varchar(255) DEFAULT NULL,
  ADD COLUMN `status` enum('pendente','aprovada','rejeitada','arquivada') NOT NULL DEFAULT 'pendente',
  ADD COLUMN `criado_por` int DEFAULT NULL,
  ADD COLUMN `aprovado_por` int DEFAULT NULL,
  ADD COLUMN `aprovado_em` datetime DEFAULT NULL,
  ADD COLUMN `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN `atualizado_em` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  ADD KEY `idx_questoes_filtros` (`status`, `curso_id`, `ano`, `dificuldade`),
  ADD KEY `idx_questoes_tema` (`tema_id`),
  ADD CONSTRAINT `fk_questoes_tema` FOREIGN KEY (`tema_id`) REFERENCES `temas` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_questoes_criado_por` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_questoes_aprovado_por` FOREIGN KEY (`aprovado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

-- Questões que já existiam no banco continuam visíveis
UPDATE `questoes` SET `status` = 'aprovada';

-- Comentários/explicações de professores e administradores (RF024, RF025)
CREATE TABLE `comentarios_questao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `questao_id` int NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `texto` text NOT NULL,
  `imagem_url` varchar(255) DEFAULT NULL,
  `video_url` varchar(255) DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comentarios_questao` (`questao_id`),
  CONSTRAINT `fk_comentarios_questao_questao` FOREIGN KEY (`questao_id`) REFERENCES `questoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comentarios_questao_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Favoritos (RF012)
CREATE TABLE `favoritos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `questao_id` int NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_favoritos_usuario_questao` (`usuario_id`, `questao_id`),
  CONSTRAINT `fk_favoritos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favoritos_questao` FOREIGN KEY (`questao_id`) REFERENCES `questoes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Simulados oficiais criados por administradores (RF032)
-- ---------------------------------------------------------------------------
CREATE TABLE `modelos_simulado` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  `curso_id` int DEFAULT NULL,
  `tempo_minutos` int NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `criado_por` int DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_modelos_simulado_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_modelos_simulado_criado_por` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `modelo_simulado_questoes` (
  `modelo_id` int NOT NULL,
  `questao_id` int NOT NULL,
  `ordem` int NOT NULL,
  PRIMARY KEY (`modelo_id`, `questao_id`),
  KEY `idx_modelo_simulado_questoes_questao` (`questao_id`),
  CONSTRAINT `fk_modelo_simulado_questoes_modelo` FOREIGN KEY (`modelo_id`) REFERENCES `modelos_simulado` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_modelo_simulado_questoes_questao` FOREIGN KEY (`questao_id`) REFERENCES `questoes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Simulados = tentativas de cada aluno (RF013–RF019)
-- ---------------------------------------------------------------------------
ALTER TABLE `simulados` DROP FOREIGN KEY `simulados_ibfk_1`;

ALTER TABLE `simulados`
  RENAME COLUMN `data_realizacao` TO `data_inicio`,
  ADD COLUMN `nome` varchar(100) DEFAULT NULL AFTER `usuario_id`,
  ADD COLUMN `modelo_id` int DEFAULT NULL AFTER `nome`,
  ADD COLUMN `curso_id` int DEFAULT NULL AFTER `modelo_id`,
  ADD COLUMN `quantidade_questoes` int NOT NULL DEFAULT 0,
  ADD COLUMN `tempo_minutos` int NOT NULL DEFAULT 0,
  ADD COLUMN `data_limite` datetime DEFAULT NULL AFTER `data_inicio`,
  ADD COLUMN `data_fim` datetime DEFAULT NULL AFTER `data_limite`,
  ADD COLUMN `status` enum('em_andamento','finalizado') NOT NULL DEFAULT 'em_andamento',
  ADD COLUMN `finalizado_por` enum('usuario','tempo') DEFAULT NULL,
  ADD COLUMN `em_branco` int NOT NULL DEFAULT 0 AFTER `erros`,
  ADD COLUMN `nota` decimal(4,2) DEFAULT NULL AFTER `percentual`,
  -- "No máximo um simulado em andamento por usuário" é garantido no back-end
  -- (transação com SELECT ... FOR UPDATE na linha do usuário), de forma
  -- compatível com todas as versões do MySQL 8.
  ADD KEY `idx_simulados_usuario_status` (`usuario_id`, `status`),
  ADD KEY `idx_simulados_status_limite` (`status`, `data_limite`),
  ADD CONSTRAINT `fk_simulados_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_simulados_modelo` FOREIGN KEY (`modelo_id`) REFERENCES `modelos_simulado` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_simulados_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`) ON DELETE SET NULL;

-- Simulados que já existiam são considerados finalizados (já possuíam resultado)
UPDATE `simulados`
   SET `status` = 'finalizado', `finalizado_por` = 'usuario', `data_fim` = `data_inicio`, `data_limite` = `data_inicio`;

-- Questões sorteadas para cada tentativa, na ordem de exibição
CREATE TABLE `simulado_questoes` (
  `simulado_id` int NOT NULL,
  `questao_id` int NOT NULL,
  `ordem` int NOT NULL,
  -- Preenchido na finalização: 1 = acertou, 0 = errou, NULL = em branco
  `acertou` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`simulado_id`, `questao_id`),
  UNIQUE KEY `uk_simulado_questoes_ordem` (`simulado_id`, `ordem`),
  KEY `idx_simulado_questoes_questao` (`questao_id`),
  CONSTRAINT `fk_simulado_questoes_simulado` FOREIGN KEY (`simulado_id`) REFERENCES `simulados` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_simulado_questoes_questao` FOREIGN KEY (`questao_id`) REFERENCES `questoes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Respostas: passam a apontar para a alternativa escolhida (resposta_usuario)
-- ---------------------------------------------------------------------------
ALTER TABLE `respostas`
  ADD COLUMN `alternativa_id` int DEFAULT NULL AFTER `questao_id`,
  ADD COLUMN `respondida_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE `respostas` r
  JOIN `alternativas` a ON a.`questao_id` = r.`questao_id` AND a.`letra` = UPPER(r.`resposta`)
   SET r.`alternativa_id` = a.`id`;

-- Mantém apenas a resposta mais recente de cada questão em cada simulado
DELETE r1 FROM `respostas` r1
  JOIN `respostas` r2
    ON r1.`simulado_id` = r2.`simulado_id` AND r1.`questao_id` = r2.`questao_id` AND r1.`id` < r2.`id`;

DELETE FROM `respostas` WHERE `alternativa_id` IS NULL;

INSERT INTO `simulado_questoes` (`simulado_id`, `questao_id`, `ordem`)
SELECT `simulado_id`, `questao_id`, ROW_NUMBER() OVER (PARTITION BY `simulado_id` ORDER BY `id`)
  FROM `respostas`;

UPDATE `simulado_questoes` sq
  JOIN `respostas` r ON r.`simulado_id` = sq.`simulado_id` AND r.`questao_id` = sq.`questao_id`
  JOIN `alternativas` a ON a.`id` = r.`alternativa_id`
   SET sq.`acertou` = a.`correta`;

ALTER TABLE `respostas`
  DROP FOREIGN KEY `respostas_ibfk_1`,
  DROP FOREIGN KEY `respostas_ibfk_2`;

ALTER TABLE `respostas`
  DROP COLUMN `resposta`,
  MODIFY COLUMN `alternativa_id` int NOT NULL,
  ADD UNIQUE KEY `uk_respostas_simulado_questao` (`simulado_id`, `questao_id`),
  ADD KEY `idx_respostas_alternativa` (`alternativa_id`),
  ADD CONSTRAINT `fk_respostas_simulado_questao` FOREIGN KEY (`simulado_id`, `questao_id`)
      REFERENCES `simulado_questoes` (`simulado_id`, `questao_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_respostas_alternativa` FOREIGN KEY (`alternativa_id`) REFERENCES `alternativas` (`id`);

-- Agora que as alternativas foram copiadas, remove as colunas antigas
ALTER TABLE `questoes`
  DROP COLUMN `alternativa_a`,
  DROP COLUMN `alternativa_b`,
  DROP COLUMN `alternativa_c`,
  DROP COLUMN `alternativa_d`,
  DROP COLUMN `alternativa_e`,
  DROP COLUMN `resposta_correta`;

-- ---------------------------------------------------------------------------
-- Fórum (RF026–RF029)
-- ---------------------------------------------------------------------------
CREATE TABLE `topicos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(200) NOT NULL,
  `conteudo` text NOT NULL,
  `usuario_id` int NOT NULL,
  `oculto` tinyint(1) NOT NULL DEFAULT 0,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_topicos_criado_em` (`criado_em`),
  CONSTRAINT `fk_topicos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `respostas_forum` (
  `id` int NOT NULL AUTO_INCREMENT,
  `topico_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `conteudo` text NOT NULL,
  `oculto` tinyint(1) NOT NULL DEFAULT 0,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_respostas_forum_topico` (`topico_id`),
  CONSTRAINT `fk_respostas_forum_topico` FOREIGN KEY (`topico_id`) REFERENCES `topicos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_respostas_forum_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Curtidas em respostas do fórum (RF028)
CREATE TABLE `curtidas` (
  `usuario_id` int NOT NULL,
  `resposta_forum_id` int NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usuario_id`, `resposta_forum_id`),
  KEY `idx_curtidas_resposta` (`resposta_forum_id`),
  CONSTRAINT `fk_curtidas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_curtidas_resposta` FOREIGN KEY (`resposta_forum_id`) REFERENCES `respostas_forum` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Curtidas em tópicos (botão "Curtir" da lista de tópicos no wireframe 10.7)
CREATE TABLE `curtidas_topicos` (
  `usuario_id` int NOT NULL,
  `topico_id` int NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usuario_id`, `topico_id`),
  KEY `idx_curtidas_topicos_topico` (`topico_id`),
  CONSTRAINT `fk_curtidas_topicos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_curtidas_topicos_topico` FOREIGN KEY (`topico_id`) REFERENCES `topicos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Denúncias (RF029): exatamente um dos alvos é preenchido (validado no back-end)
CREATE TABLE `denuncias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `topico_id` int DEFAULT NULL,
  `resposta_forum_id` int DEFAULT NULL,
  `comentario_id` int DEFAULT NULL,
  `motivo` text NOT NULL,
  `status` enum('pendente','procedente','improcedente') NOT NULL DEFAULT 'pendente',
  `analisado_por` int DEFAULT NULL,
  `analisado_em` datetime DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_denuncias_status` (`status`),
  CONSTRAINT `fk_denuncias_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_denuncias_topico` FOREIGN KEY (`topico_id`) REFERENCES `topicos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_denuncias_resposta_forum` FOREIGN KEY (`resposta_forum_id`) REFERENCES `respostas_forum` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_denuncias_comentario` FOREIGN KEY (`comentario_id`) REFERENCES `comentarios_questao` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_denuncias_analisado_por` FOREIGN KEY (`analisado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
