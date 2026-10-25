-- Cria o usuário MySQL dedicado ao ENAHub (uma única vez, como root).
--
-- NÃO edite este arquivo com a sua senha real e NÃO faça commit dela.
-- Copie os comandos abaixo para o MySQL (mysql -u root -p, MySQL Command Line Client
-- ou MySQL Workbench), trocando 'troque-esta-senha' pela senha escolhida.
-- Use a mesma senha em backend/.env (DB_PASSWORD).
-- Guia completo: docs/INSTALACAO.md (passo 2).
CREATE USER IF NOT EXISTS 'enahub_app'@'localhost' IDENTIFIED BY 'troque-esta-senha';
GRANT ALL PRIVILEGES ON enahub.* TO 'enahub_app'@'localhost';
GRANT ALL PRIVILEGES ON enahub_test.* TO 'enahub_app'@'localhost';
FLUSH PRIVILEGES;
