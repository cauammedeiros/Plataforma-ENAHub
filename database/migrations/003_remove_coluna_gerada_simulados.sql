-- 003 - Remove a coluna gerada usuario_em_andamento (e seu índice único), caso exista.
-- Ela foi criada por uma versão anterior (não publicada) da migration 002. Coluna gerada
-- com FK em cascata não é garantida no MySQL 8.0; a regra passou para o back-end.
-- Em bancos criados com a 002 atual, este script não faz nada.

SET @existe = (SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'simulados'
                  AND column_name = 'usuario_em_andamento');

SET @sql = IF(@existe > 0,
  'ALTER TABLE `simulados` DROP INDEX `uk_simulados_um_em_andamento`, DROP COLUMN `usuario_em_andamento`, ADD KEY `idx_simulados_usuario_status` (`usuario_id`, `status`)',
  'DO 0');
PREPARE comando FROM @sql;
EXECUTE comando;
DEALLOCATE PREPARE comando;
