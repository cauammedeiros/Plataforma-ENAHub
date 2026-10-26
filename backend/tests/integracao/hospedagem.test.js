const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { recriarBancoDeTeste, iniciarServidor } = require('../helpers');
const config = require('../../src/config');
const db = require('../../src/database');
const limiteTentativas = require('../../src/middlewares/limiteTentativas');

// Ajustes para a hospedagem serverless (Vercel): limite de tentativas gravado no banco
// e cadastro restrito por código de convite
describe('Hospedagem: limite no banco e código de convite', () => {
    let api; let encerrar; let cursoId;

    before(async () => {
        await recriarBancoDeTeste();
        ({ api, encerrar } = await iniciarServidor());
        cursoId = (await api('GET', '/api/cursos')).corpo[0].id;
    });
    after(() => encerrar());

    async function servidorComLimiteNoBanco() {
        const limite = limiteTentativas({ maximo: 3, janelaMinutos: 1, banco: true });
        limite.ativoEmTestes = true;
        const app = express();
        app.use(express.json());
        app.post('/login', limite, (req, res) => res.status(req.body.senha === 'certa' ? 200 : 401).json({}));
        const servidor = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
        const enviar = (corpo) => fetch(`http://127.0.0.1:${servidor.address().port}/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo)
        }).then((r) => r.status);
        return { enviar, fechar: () => new Promise((r) => servidor.close(r)) };
    }

    test('limite no banco vale entre instâncias e não grava o e-mail', async () => {
        const instanciaA = await servidorComLimiteNoBanco();
        const instanciaB = await servidorComLimiteNoBanco();
        assert.equal(await instanciaA.enviar({ email: 'alvo@x.com', senha: 'errada' }), 401);
        assert.equal(await instanciaB.enviar({ email: 'alvo@x.com', senha: 'errada' }), 401);
        assert.equal(await instanciaA.enviar({ email: 'alvo@x.com', senha: 'errada' }), 401);
        // A instância B enxerga as falhas registradas pela A
        assert.equal(await instanciaB.enviar({ email: 'alvo@x.com', senha: 'certa' }), 429);
        assert.equal(await instanciaB.enviar({ email: 'outro@x.com', senha: 'certa' }), 200);
        // Sucesso não conta
        for (let i = 0; i < 5; i++) assert.equal(await instanciaA.enviar({ email: 'ok@x.com', senha: 'certa' }), 200);

        const [linhas] = await db.query('SELECT chave, falhas FROM limites_tentativas');
        assert.equal(linhas.length, 1);
        assert.equal(linhas[0].falhas, 3);
        assert.match(linhas[0].chave, /^[0-9a-f]{64}$/);

        // Janela vencida: a contagem recomeça
        await db.query('UPDATE limites_tentativas SET expira_em = ?', [new Date(Date.now() - 1000)]);
        assert.equal(await instanciaA.enviar({ email: 'alvo@x.com', senha: 'errada' }), 401);
        const [[depois]] = await db.query('SELECT falhas FROM limites_tentativas');
        assert.equal(depois.falhas, 1);
        assert.equal(await instanciaA.enviar({ email: 'alvo@x.com', senha: 'certa' }), 200);

        await instanciaA.fechar();
        await instanciaB.fechar();
    });

    test('com CODIGO_CONVITE definido, o cadastro exige o código correto', async () => {
        const original = config.codigoConvite;
        config.codigoConvite = 'convite-de-teste';
        try {
            const aluno = (extra) => ({
                nome: 'Convidada Teste', email: 'convidada@unifor.br', senha: 'SenhaForte1', curso_id: cursoId,
                instituicao: 'Universidade de Fortaleza (UNIFOR)', aceite_termos: true, ...extra
            });
            let r = await api('POST', '/api/auth/cadastro', { corpo: aluno() });
            assert.equal(r.status, 400);
            assert.ok(r.corpo.erros.codigo_convite);
            r = await api('POST', '/api/auth/cadastro', { corpo: aluno({ codigo_convite: 'errado' }) });
            assert.equal(r.status, 400);
            r = await api('POST', '/api/auth/cadastro', { corpo: aluno({ codigo_convite: ' convite-de-teste ' }) });
            assert.equal(r.status, 201);
            assert.equal(r.corpo.usuario.perfil, 'aluno');
        } finally {
            config.codigoConvite = original;
        }
    });

    test('sem CODIGO_CONVITE (uso local), o cadastro continua sem código', async () => {
        assert.equal(config.codigoConvite, '');
        const r = await api('POST', '/api/auth/cadastro', { corpo: {
            nome: 'Aluno Local', email: 'local@unifor.br', senha: 'SenhaForte1', curso_id: cursoId,
            instituicao: 'UNIFOR', aceite_termos: true
        } });
        assert.equal(r.status, 201);
    });
});
