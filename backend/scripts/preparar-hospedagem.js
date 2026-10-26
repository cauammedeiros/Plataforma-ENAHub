/**
 * Prepara o banco MySQL da hospedagem (Aiven) para a demonstração online.
 *
 * Uso (o arquivo de configuração fica FORA do repositório):
 *   ENAHUB_ENV_FILE=~/enahub_hospedagem/hospedagem.env node scripts/preparar-hospedagem.js
 *
 * Variáveis do arquivo:
 *   AIVEN_URI         URI de serviço do Aiven (usuário administrador, usado só aqui)
 *   DB_SSL_CA_FILE    caminho do certificado CA baixado do Aiven
 *   DB_NAME           banco exclusivo da demonstração (ex.: enahub_demo)
 *   DB_TIMEZONE       Z (datas em UTC, igual à Vercel)
 *   SEED_SENHA        senha das contas de demonstração ONLINE (diferente da senha local)
 *   APP_DB_USER       usuário da API (só SELECT/INSERT/UPDATE/DELETE no DB_NAME)
 *   APP_DB_PASSWORD   senha desse usuário
 *
 * O que faz (nada é apagado):
 *   1. confere TLS com validação do certificado e a versão do MySQL;
 *   2. aplica as migrations pendentes (recusa banco com tabelas criadas fora delas);
 *   3. insere os dados de demonstração que faltam (idempotente);
 *   4. cria/atualiza o usuário da API com privilégios mínimos e TLS obrigatório.
 */
require('dotenv').config({ path: process.env.ENAHUB_ENV_FILE || '', quiet: true });

function falhar(mensagem) {
    console.error(`✖ ${mensagem}`);
    process.exit(1);
}

if (!process.env.ENAHUB_ENV_FILE) falhar('Defina ENAHUB_ENV_FILE com o arquivo de configuração da hospedagem.');
if (!process.env.AIVEN_URI) falhar('AIVEN_URI não definida no arquivo de configuração.');

// A URI do administrador vira as variáveis DB_* usadas pelos scripts (só neste processo)
const uri = new URL(process.env.AIVEN_URI);
process.env.DB_HOST = uri.hostname;
process.env.DB_PORT = uri.port;
process.env.DB_USER = decodeURIComponent(uri.username);
process.env.DB_PASSWORD = decodeURIComponent(uri.password);

const obrigatorias = ['DB_SSL_CA_FILE', 'DB_NAME', 'SEED_SENHA', 'APP_DB_USER', 'APP_DB_PASSWORD'];
for (const nome of obrigatorias) if (!process.env[nome]) falhar(`${nome} não definida no arquivo de configuração.`);
if (['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST)) falhar('Este script é só para o banco hospedado, não para o MySQL local.');
if (process.env.SEED_SENHA === 'Enahub@2026') falhar('Use em SEED_SENHA uma senha diferente da senha pública da demonstração local.');
if (process.env.DB_TIMEZONE !== 'Z') falhar('Use DB_TIMEZONE=Z (a Vercel trabalha em UTC).');
if (!/^[a-z_][a-z0-9_]{0,31}$/.test(process.env.APP_DB_USER)) falhar('APP_DB_USER inválido.');
if (!/^[a-z_][a-z0-9_]{0,63}$/.test(process.env.DB_NAME)) falhar('DB_NAME inválido.');

const mysql = require('mysql2/promise');
const config = require('../src/config');
const { migrar } = require('./migrate');

async function main() {
    if (!config.db.ssl) falhar('Certificado CA não carregado: confira DB_SSL_CA_FILE.');

    const conn = await mysql.createConnection({
        host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password,
        ssl: config.db.ssl
    });
    try {
        const [[{ versao }]] = await conn.query('SELECT VERSION() AS versao');
        const [[cifra]] = await conn.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
        if (!cifra || !cifra.Value) falhar('A conexão não está usando TLS.');
        console.log(`✔ MySQL ${versao} em ${config.db.host} via TLS (${cifra.Value}), certificado validado pelo CA`);
    } finally {
        await conn.end();
    }

    await migrar({ confirmado: false });

    const { seed } = require('./seed');
    await seed();

    const usuario = process.env.APP_DB_USER;
    const admin = await mysql.createConnection({
        host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password,
        ssl: config.db.ssl
    });
    try {
        await admin.query('CREATE USER IF NOT EXISTS ?@\'%\' IDENTIFIED BY ? REQUIRE SSL',
            [usuario, process.env.APP_DB_PASSWORD]);
        await admin.query('ALTER USER ?@\'%\' IDENTIFIED BY ? REQUIRE SSL', [usuario, process.env.APP_DB_PASSWORD]);
        await admin.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${config.db.database}\`.* TO ?@'%'`, [usuario]);
        const [concessoes] = await admin.query('SHOW GRANTS FOR ?@\'%\'', [usuario]);
        console.log(`✔ Usuário da API "${usuario}" (TLS obrigatório) com privilégios:`);
        for (const linha of concessoes) console.log(`    ${Object.values(linha)[0]}`);
    } finally {
        await admin.end();
    }

    await require('../src/database').end();
    console.log(`\n✔ Banco "${config.db.database}" pronto para a hospedagem.`);
}

main().catch((erro) => {
    console.error(`✖ ${erro.message}`);
    process.exit(1);
});
