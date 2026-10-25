-- Cria um usuário MySQL dedicado ao ENAHub (execute uma única vez como root):
--   mysql -u root -p < database/criar_usuario_mysql.sql
-- Troque a senha abaixo e use a mesma em backend/.env (DB_PASSWORD).
CREATE USER IF NOT EXISTS 'enahub_app'@'localhost' IDENTIFIED BY 'troque-esta-senha';
GRANT ALL PRIVILEGES ON enahub.* TO 'enahub_app'@'localhost';
GRANT ALL PRIVILEGES ON enahub_test.* TO 'enahub_app'@'localhost';
FLUSH PRIVILEGES;
