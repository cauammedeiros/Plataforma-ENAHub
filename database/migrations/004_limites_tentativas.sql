-- Contador de tentativas com erro (login, cadastro, recuperação de senha) compartilhado
-- entre as instâncias da hospedagem serverless. Localmente o contador fica em memória.
-- A chave é um hash SHA-256 (IP + rota + e-mail): o e-mail não fica gravado.
CREATE TABLE IF NOT EXISTS `limites_tentativas` (
  `chave` char(64) NOT NULL,
  `falhas` int unsigned NOT NULL DEFAULT 1,
  `expira_em` datetime NOT NULL,
  PRIMARY KEY (`chave`),
  KEY `idx_limites_tentativas_expira` (`expira_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
