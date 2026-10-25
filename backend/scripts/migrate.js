/**
 * Executa as migrations de database/migrations em ordem alfabética.
 * Cada arquivo roda uma única vez; o controle fica na tabela schema_migrations.
 *
 * Uso: npm run db:migrate            (banco do .env, DB_NAME)
 *      DB_NAME=enahub_test npm run db:migrate
 *
 * Atenção: no MySQL, comandos DDL (CREATE/ALTER) não podem ser desfeitos por
 * rollback. Faça backup (mysqldump) antes de migrar um banco com dados reais.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

const PASTA = path.join(__dirname, '..', '..', 'database', 'migrations');

async function migrar({ database = config.db.database, silencioso = false } = {}) {
    const log = silencioso ? () => {} : console.log;
    const conn = await mysql.createConnection({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        multipleStatements: true
    });

    try {
        await conn.query(
            `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
        );
        await conn.query(`USE \`${database}\``);
        await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
            arquivo varchar(255) NOT NULL PRIMARY KEY,
            executada_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);

        const [feitas] = await conn.query('SELECT arquivo FROM schema_migrations');
        const jaExecutadas = new Set(feitas.map((linha) => linha.arquivo));
        const arquivos = fs.readdirSync(PASTA).filter((a) => a.endsWith('.sql')).sort();

        let executadas = 0;
        for (const arquivo of arquivos) {
            if (jaExecutadas.has(arquivo)) continue;
            log(`→ Executando ${arquivo}...`);
            const sql = fs.readFileSync(path.join(PASTA, arquivo), 'utf8');
            try {
                await conn.query(sql);
            } catch (erro) {
                throw new Error(`Falha na migration ${arquivo}: ${erro.message}`);
            }
            await conn.query('INSERT INTO schema_migrations (arquivo) VALUES (?)', [arquivo]);
            executadas++;
        }
        log(executadas ? `✔ ${executadas} migration(s) aplicada(s) em "${database}".`
                       : `✔ Banco "${database}" já está atualizado.`);
    } finally {
        await conn.end();
    }
}

if (require.main === module) {
    migrar().catch((erro) => {
        console.error('✖', erro.message);
        process.exit(1);
    });
}

module.exports = { migrar };
