/**
 * Diagnóstico do ambiente local do ENAHub (não altera nada).
 *
 * Uso: cd backend && npm run verificar
 *
 * Confere branch do Git, versão do Node, arquivo .env, conexão e versão do
 * MySQL, migrations pendentes, contas de demonstração e porta do servidor.
 */
const fs = require('fs');
const net = require('net');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const ARQUIVO_ENV = path.join(__dirname, '..', '.env');
const BRANCH_COMPLETA = 'feat/enahub-mvp-03nov';

let problemas = 0;
const ok = (msg) => console.log(`  ✔ ${msg}`);
const aviso = (msg, dica) => console.log(`  ! ${msg}${dica ? `\n      → ${dica}` : ''}`);
const erro = (msg, dica) => {
    problemas++;
    console.log(`  ✖ ${msg}${dica ? `\n      → ${dica}` : ''}`);
};

function compararVersao(atual, minima) {
    const a = atual.split('.').map(Number);
    const m = minima.split('.').map(Number);
    for (let i = 0; i < m.length; i++) {
        if ((a[i] || 0) !== m[i]) return (a[i] || 0) > m[i];
    }
    return true;
}

function portaLivre(porta) {
    return new Promise((resolve) => {
        const servidor = net.createServer()
            .once('error', () => resolve(false))
            .once('listening', () => servidor.close(() => resolve(true)))
            .listen(porta);
    });
}

async function main() {
    console.log('\nDiagnóstico do ambiente ENAHub\n');

    // 1. Git
    try {
        const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: RAIZ }).toString().trim();
        if (branch === BRANCH_COMPLETA) ok(`Branch do Git: ${branch}`);
        else aviso(`Branch atual: ${branch} (a versão completa do MVP está em ${BRANCH_COMPLETA})`,
            `git switch ${BRANCH_COMPLETA}`);
    } catch {
        aviso('Não foi possível ler a branch do Git (o projeto foi baixado como .zip?)');
    }

    // 2. Node
    const node = process.versions.node;
    if (compararVersao(node, '22.12.0')) ok(`Node.js ${node}`);
    else erro(`Node.js ${node} é antigo demais (mínimo 22.12)`, 'Instale a versão LTS em https://nodejs.org');

    // 3. .env
    if (!fs.existsSync(ARQUIVO_ENV)) {
        erro('Arquivo backend/.env não encontrado',
            'Copie o modelo: cp .env.example .env  (Windows: copy .env.example .env) e preencha DB_PASSWORD');
        return finalizar();
    }
    const config = require('../src/config');
    ok('Arquivo backend/.env encontrado');
    if (!config.db.password || config.db.password === 'troque-esta-senha') {
        erro('DB_PASSWORD no .env ainda é o valor de exemplo',
            'Use a mesma senha definida ao criar o usuário enahub_app (database/criar_usuario_mysql.sql)');
    }

    // 4. MySQL
    const mysql = require('mysql2/promise');
    let conn;
    try {
        conn = await mysql.createConnection({
            host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password,
            ssl: config.db.ssl
        });
    } catch (e) {
        const dicas = {
            ECONNREFUSED: `Nenhum MySQL respondendo em ${config.db.host}:${config.db.port}. Inicie o serviço MySQL (macOS: brew services start mysql; Windows: serviço "MySQL80").`,
            ER_ACCESS_DENIED_ERROR: `Usuário/senha recusados. Confira DB_USER e DB_PASSWORD no .env e se o usuário ${config.db.user} foi criado (database/criar_usuario_mysql.sql).`
        };
        erro(`Falha ao conectar no MySQL: ${e.code || e.message}`, dicas[e.code] || e.message);
        return finalizar();
    }
    const [[{ versao, comentario }]] = await conn.query('SELECT VERSION() AS versao, @@version_comment AS comentario');
    if (/mariadb/i.test(`${versao} ${comentario}`)) {
        erro(`Servidor é MariaDB (${versao}), por exemplo do XAMPP. O ENAHub exige MySQL 8.0.19 ou superior.`,
            'Instale o MySQL Community Server 8 (dev.mysql.com/downloads/installer) e pare o MySQL do XAMPP.');
    } else if (compararVersao(versao.split('-')[0], '8.0.19')) {
        ok(`MySQL ${versao} (usuário ${config.db.user})`);
    } else {
        erro(`MySQL ${versao} é antigo demais (mínimo 8.0.19)`, 'Atualize para o MySQL 8.0 ou superior.');
    }

    // 5. Banco e migrations
    const [bancos] = await conn.query('SHOW DATABASES LIKE ?', [config.db.database]);
    if (!bancos.length) {
        erro(`Banco "${config.db.database}" ainda não existe`, 'Crie e popule: npm run db:setup');
    } else {
        await conn.query(`USE \`${config.db.database}\``);
        const pastas = fs.readdirSync(path.join(RAIZ, 'database', 'migrations')).filter((a) => a.endsWith('.sql'));
        let aplicadas = [];
        try {
            [aplicadas] = await conn.query('SELECT arquivo FROM schema_migrations');
        } catch {
            aplicadas = [];
        }
        const pendentes = pastas.filter((a) => !aplicadas.some((m) => m.arquivo === a));
        if (pendentes.length) erro(`Migrations pendentes: ${pendentes.join(', ')}`, 'npm run db:migrate');
        else ok(`Banco "${config.db.database}" com todas as ${pastas.length} migrations aplicadas`);

        try {
            const [[{ demo }]] = await conn.query("SELECT COUNT(*) AS demo FROM usuarios WHERE email LIKE '%@enahub.demo'");
            const [[{ questoes }]] = await conn.query("SELECT COUNT(*) AS questoes FROM questoes WHERE status = 'aprovada'");
            if (demo > 0) ok(`${demo} conta(s) de demonstração e ${questoes} questão(ões) publicadas`);
            else aviso('Contas de demonstração não encontradas', 'npm run db:seed');
        } catch {
            // tabelas ainda não existem: já reportado como migration pendente
        }
    }
    await conn.end();

    // 6. Porta do servidor
    if (await portaLivre(config.porta)) {
        ok(`Porta ${config.porta} livre para o back-end`);
    } else {
        let ehEnahub = false;
        try {
            const r = await fetch(`http://localhost:${config.porta}/`);
            ehEnahub = (await r.json()).mensagem === 'API do ENAHub funcionando!';
        } catch {
            ehEnahub = false;
        }
        if (ehEnahub) ok(`Back-end do ENAHub já está rodando na porta ${config.porta}`);
        else erro(`Porta ${config.porta} ocupada por outro programa`,
            'Use outra porta: PORT=3001 no backend/.env e VITE_API_PROXY=http://localhost:3001 em frontend/.env.local');
    }

    // 7. Dependências do front-end
    if (fs.existsSync(path.join(RAIZ, 'frontend', 'node_modules'))) ok('Dependências do front-end instaladas');
    else aviso('Dependências do front-end ainda não instaladas', 'cd ../frontend && npm install');

    finalizar();
}

function finalizar() {
    console.log(problemas
        ? `\n${problemas} problema(s) encontrado(s). Corrija os itens marcados com ✖ e rode de novo.\n`
        : '\nTudo pronto! Inicie com "npm start" (backend) e "npm run dev" (frontend).\n');
    process.exitCode = problemas ? 1 : 0;
}

main().catch((e) => {
    console.error('Erro inesperado no diagnóstico:', e.message);
    process.exitCode = 1;
});
