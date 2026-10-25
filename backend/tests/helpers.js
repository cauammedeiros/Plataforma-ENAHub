/**
 * Utilitários dos testes de integração.
 * IMPORTANTE: os testes usam SEMPRE o banco DB_NAME_TEST (padrão enahub_test),
 * que é apagado e recriado no início de cada arquivo de teste.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME_TEST || 'enahub_test';
if (!process.env.DB_NAME.endsWith('_test')) {
    throw new Error('Por segurança, o banco de testes precisa terminar com "_test".');
}

const mysql = require('mysql2/promise');
const config = require('../src/config');

async function recriarBancoDeTeste({ comSeed = true } = {}) {
    const conn = await mysql.createConnection({
        host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password
    });
    await conn.query(`DROP DATABASE IF EXISTS \`${config.db.database}\``);
    await conn.end();

    const { migrar } = require('../scripts/migrate');
    await migrar({ silencioso: true });
    if (comSeed) {
        const { seed } = require('../scripts/seed');
        await seed({ silencioso: true });
    }
}

async function iniciarServidor() {
    const app = require('../src/app');
    const servidor = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
    });
    const base = `http://127.0.0.1:${servidor.address().port}`;

    async function api(metodo, caminho, { token, corpo } = {}) {
        const resposta = await fetch(base + caminho, {
            method: metodo,
            headers: {
                ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: corpo !== undefined ? JSON.stringify(corpo) : undefined
        });
        const texto = await resposta.text();
        return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
    }

    async function encerrar() {
        await new Promise((resolve) => servidor.close(resolve));
        await require('../src/database').end();
    }

    return { api, encerrar };
}

const SENHA_DEMO = 'Enahub@2026';

async function login(api, email, senha = SENHA_DEMO) {
    const r = await api('POST', '/api/auth/login', { corpo: { email, senha } });
    if (r.status !== 200) throw new Error(`Login falhou para ${email}: ${JSON.stringify(r.corpo)}`);
    return r.corpo.token;
}

module.exports = { recriarBancoDeTeste, iniciarServidor, login, SENHA_DEMO };
