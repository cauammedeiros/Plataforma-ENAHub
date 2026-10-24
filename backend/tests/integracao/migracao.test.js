const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('../helpers');
const config = require('../../src/config');
const { migrar } = require('../../scripts/migrate');

/**
 * Simula o banco de um integrante que já importou o database/enahub.sql
 * original e cadastrou dados nele. A migration 002 deve preservar esses dados.
 */
describe('Migrations preservam dados do esquema original', () => {
    let conn;

    before(async () => {
        conn = await mysql.createConnection({
            host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password,
            multipleStatements: true
        });
        await conn.query(`DROP DATABASE IF EXISTS \`${config.db.database}\``);
        await conn.query(`CREATE DATABASE \`${config.db.database}\``);
        await conn.query(`USE \`${config.db.database}\``);
        // Importa o dump original da equipe, exatamente como está no repositório
        const dump = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'database', 'enahub.sql'), 'utf8');
        await conn.query(dump);
        await conn.query(`
            INSERT INTO cursos (id, nome) VALUES (1, 'Curso Legado');
            INSERT INTO usuarios (id, nome, email, senha, curso_id) VALUES (1, 'Usuário Legado', 'legado@unifor.br', 'hash-antigo', 1);
            INSERT INTO questoes (id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, resposta_correta, curso_id)
                 VALUES (1, 'Questão legada', 'a1', 'b1', 'c1', 'd1', 'e1', 'C', 1),
                        (2, 'Outra questão legada', 'a2', 'b2', 'c2', 'd2', 'e2', 'a', 1);
            INSERT INTO simulados (id, usuario_id, acertos, erros, percentual) VALUES (1, 1, 1, 1, 50.00);
            INSERT INTO respostas (simulado_id, questao_id, resposta) VALUES (1, 1, 'C'), (1, 2, 'B');
        `);
    });
    after(() => conn.end());

    test('aplica as migrations sobre o banco existente sem perder dados', async () => {
        await migrar({ silencioso: true });

        const [[usuario]] = await conn.query('SELECT nome, email, perfil, curso_id FROM usuarios WHERE id = 1');
        assert.deepEqual({ ...usuario }, { nome: 'Usuário Legado', email: 'legado@unifor.br', perfil: 'aluno', curso_id: 1 });

        const [alternativas] = await conn.query('SELECT questao_id, letra, texto, correta FROM alternativas ORDER BY questao_id, letra');
        assert.equal(alternativas.length, 10);
        assert.deepEqual(alternativas.filter((a) => a.correta).map((a) => [a.questao_id, a.letra]), [[1, 'C'], [2, 'A']]);
        assert.equal(alternativas.find((a) => a.questao_id === 2 && a.letra === 'E').texto, 'e2');

        const [questoes] = await conn.query('SELECT id, status FROM questoes ORDER BY id');
        assert.deepEqual(questoes.map((q) => q.status), ['aprovada', 'aprovada']);

        const [[simulado]] = await conn.query('SELECT status, acertos, erros, percentual FROM simulados WHERE id = 1');
        assert.equal(simulado.status, 'finalizado');
        assert.equal(Number(simulado.percentual), 50);

        const [respostas] = await conn.query(
            `SELECT r.questao_id, a.letra, sq.acertou FROM respostas r
               JOIN alternativas a ON a.id = r.alternativa_id
               JOIN simulado_questoes sq ON sq.simulado_id = r.simulado_id AND sq.questao_id = r.questao_id
              ORDER BY r.questao_id`
        );
        assert.deepEqual(respostas.map((r) => [r.questao_id, r.letra, r.acertou]), [[1, 'C', 1], [2, 'B', 0]]);
    });

    test('rodar de novo não altera nada (idempotente)', async () => {
        await migrar({ silencioso: true });
        const [migracoes] = await conn.query('SELECT arquivo FROM schema_migrations ORDER BY arquivo');
        const arquivos = fs.readdirSync(path.join(__dirname, '..', '..', '..', 'database', 'migrations')).filter((a) => a.endsWith('.sql')).sort();
        assert.deepEqual(migracoes.map((m) => m.arquivo), arquivos);
    });

    test('003 remove a coluna gerada criada por uma versão antiga da 002 (e não faz nada se ela não existe)', async () => {
        await conn.query(`ALTER TABLE simulados DROP INDEX idx_simulados_usuario_status,
            ADD COLUMN usuario_em_andamento int GENERATED ALWAYS AS (IF(status = 'em_andamento', usuario_id, NULL)) VIRTUAL,
            ADD UNIQUE KEY uk_simulados_um_em_andamento (usuario_em_andamento)`);
        const sql = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'database', 'migrations', '003_remove_coluna_gerada_simulados.sql'), 'utf8');
        await conn.query(sql);
        const [colunas] = await conn.query("SHOW COLUMNS FROM simulados LIKE 'usuario_em_andamento'");
        assert.equal(colunas.length, 0);
        const [indices] = await conn.query("SHOW INDEX FROM simulados WHERE Key_name = 'idx_simulados_usuario_status'");
        assert.ok(indices.length > 0);
        await conn.query(sql); // segunda execução: nenhuma alteração
        const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM simulados');
        assert.equal(total, 1);
    });
});
