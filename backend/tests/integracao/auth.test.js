const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { recriarBancoDeTeste, iniciarServidor, login } = require('../helpers');

describe('Autenticação, perfil e permissões', () => {
    let api; let encerrar; let cursoId;
    const novoAluno = () => ({
        nome: 'Aluna Teste Integração',
        email: 'aluna.teste@unifor.br',
        senha: 'SenhaForte1',
        curso_id: cursoId,
        instituicao: 'Universidade de Fortaleza (UNIFOR)',
        aceite_termos: true
    });

    before(async () => {
        await recriarBancoDeTeste();
        ({ api, encerrar } = await iniciarServidor());
        const cursos = await api('GET', '/api/cursos');
        cursoId = cursos.corpo[0].id;
    });
    after(() => encerrar());

    test('cadastro valida campos obrigatórios (RF001)', async () => {
        const r = await api('POST', '/api/auth/cadastro', { corpo: { email: 'x' } });
        assert.equal(r.status, 400);
        for (const campo of ['nome', 'email', 'senha', 'curso_id', 'instituicao', 'aceite_termos']) {
            assert.ok(r.corpo.erros[campo], `esperava erro em ${campo}`);
        }
    });

    test('cadastro cria aluno, guarda hash da senha e já autentica', async () => {
        const r = await api('POST', '/api/auth/cadastro', { corpo: novoAluno() });
        assert.equal(r.status, 201);
        assert.equal(r.corpo.usuario.perfil, 'aluno');
        assert.equal(r.corpo.usuario.instituicao, 'Universidade de Fortaleza (UNIFOR)');
        assert.ok(r.corpo.token);
        assert.equal(r.corpo.usuario.senha, undefined);

        const db = require('../../src/database');
        const [[u]] = await db.query('SELECT senha FROM usuarios WHERE email = ?', ['aluna.teste@unifor.br']);
        assert.match(u.senha, /^scrypt\$/);
    });

    test('não permite e-mail duplicado, mesmo com maiúsculas', async () => {
        const r = await api('POST', '/api/auth/cadastro', { corpo: { ...novoAluno(), email: 'ALUNA.TESTE@unifor.br' } });
        assert.equal(r.status, 409);
    });

    test('perfil enviado no cadastro é ignorado (não dá para virar admin)', async () => {
        const r = await api('POST', '/api/auth/cadastro', {
            corpo: { ...novoAluno(), email: 'espertinho@unifor.br', perfil: 'admin' }
        });
        assert.equal(r.status, 201);
        assert.equal(r.corpo.usuario.perfil, 'aluno');
    });

    test('login: senha errada e e-mail inexistente têm a mesma resposta (RF002)', async () => {
        const a = await api('POST', '/api/auth/login', { corpo: { email: 'aluna.teste@unifor.br', senha: 'Errada123' } });
        const b = await api('POST', '/api/auth/login', { corpo: { email: 'naoexiste@unifor.br', senha: 'Errada123' } });
        assert.equal(a.status, 401);
        assert.equal(b.status, 401);
        assert.equal(a.corpo.mensagem, b.corpo.mensagem);
    });

    test('rotas protegidas exigem token; logout invalida o token', async () => {
        assert.equal((await api('GET', '/api/auth/me')).status, 401);
        assert.equal((await api('GET', '/api/auth/me', { token: 'invalido' })).status, 401);

        const token = await login(api, 'aluna.teste@unifor.br', 'SenhaForte1');
        const me = await api('GET', '/api/auth/me', { token });
        assert.equal(me.status, 200);
        assert.equal(me.corpo.usuario.email, 'aluna.teste@unifor.br');

        assert.equal((await api('POST', '/api/auth/logout', { token })).status, 200);
        assert.equal((await api('GET', '/api/auth/me', { token })).status, 401);
    });

    test('aluno não acessa rotas de professor/admin (403)', async () => {
        const token = await login(api, 'aluno@enahub.demo');
        assert.equal((await api('GET', '/api/admin/usuarios', { token })).status, 403);
        assert.equal((await api('POST', '/api/questoes', { token, corpo: {} })).status, 403);
        assert.equal((await api('PATCH', '/api/questoes/1/status', { token, corpo: { status: 'aprovada' } })).status, 403);

        const prof = await login(api, 'professor@enahub.demo');
        assert.equal((await api('GET', '/api/admin/relatorios', { token: prof })).status, 403);
        assert.equal((await api('PATCH', '/api/questoes/1/status', { token: prof, corpo: { status: 'aprovada' } })).status, 403);
    });

    test('admin bloqueia usuário: sessões caem e o login é recusado (RF030)', async () => {
        const admin = await login(api, 'admin@enahub.demo');
        const tokenRafael = await login(api, 'rafael@enahub.demo');
        const lista = await api('GET', '/api/admin/usuarios?busca=rafael', { token: admin });
        const rafael = lista.corpo[0];

        const r = await api('PATCH', `/api/admin/usuarios/${rafael.id}`, { token: admin, corpo: { bloqueado: true } });
        assert.equal(r.status, 200);
        assert.equal((await api('GET', '/api/auth/me', { token: tokenRafael })).status, 401);
        const novo = await api('POST', '/api/auth/login', { corpo: { email: 'rafael@enahub.demo', senha: 'Enahub@2026' } });
        assert.equal(novo.status, 403);

        await api('PATCH', `/api/admin/usuarios/${rafael.id}`, { token: admin, corpo: { bloqueado: false } });
        assert.ok(await login(api, 'rafael@enahub.demo'));
    });

    test('recuperação de senha com link de uso único (RF003)', async () => {
        const inexistente = await api('POST', '/api/auth/esqueci-senha', { corpo: { email: 'ninguem@unifor.br' } });
        assert.equal(inexistente.status, 200);
        assert.equal(inexistente.corpo.link_desenvolvimento, undefined);

        const authService = require('../../src/services/auth.service');
        const link = await authService.solicitarRecuperacao('aluna.teste@unifor.br');
        const token = new URL(link).searchParams.get('token');

        const fraca = await api('POST', '/api/auth/redefinir-senha', { corpo: { token, nova_senha: '123' } });
        assert.equal(fraca.status, 400);

        const ok = await api('POST', '/api/auth/redefinir-senha', { corpo: { token, nova_senha: 'NovaSenha2' } });
        assert.equal(ok.status, 200);
        const reuso = await api('POST', '/api/auth/redefinir-senha', { corpo: { token, nova_senha: 'OutraSenha3' } });
        assert.equal(reuso.status, 400);

        assert.ok(await login(api, 'aluna.teste@unifor.br', 'NovaSenha2'));
    });

    test('edição de perfil e troca de senha exigem a senha atual (RF004)', async () => {
        const token = await login(api, 'aluna.teste@unifor.br', 'NovaSenha2');
        const r = await api('PUT', '/api/usuarios/me', { token, corpo: { nome: 'Aluna Editada', instituicao: 'Universidade Federal do Ceará (UFC)' } });
        assert.equal(r.status, 200);
        assert.equal(r.corpo.usuario.nome, 'Aluna Editada');
        assert.equal(r.corpo.usuario.instituicao, 'Universidade Federal do Ceará (UFC)');

        const semAtual = await api('PUT', '/api/usuarios/me', { token, corpo: { nova_senha: 'Trocada123' } });
        assert.equal(semAtual.status, 400);
        const comAtual = await api('PUT', '/api/usuarios/me', { token, corpo: { senha_atual: 'NovaSenha2', nova_senha: 'Trocada123' } });
        assert.equal(comAtual.status, 200);
        assert.ok(await login(api, 'aluna.teste@unifor.br', 'Trocada123'));
    });

    test('exclusão de conta exige senha e confirmação, e remove os dados (RF005)', async () => {
        const token = await login(api, 'aluna.teste@unifor.br', 'Trocada123');
        const semConfirmar = await api('DELETE', '/api/usuarios/me', { token, corpo: { senha: 'Trocada123' } });
        assert.equal(semConfirmar.status, 400);
        const senhaErrada = await api('DELETE', '/api/usuarios/me', { token, corpo: { senha: 'Errada999', confirmacao: 'EXCLUIR' } });
        assert.equal(senhaErrada.status, 400);

        const ok = await api('DELETE', '/api/usuarios/me', { token, corpo: { senha: 'Trocada123', confirmacao: 'EXCLUIR' } });
        assert.equal(ok.status, 200);
        assert.equal((await api('GET', '/api/auth/me', { token })).status, 401);
        const relogin = await api('POST', '/api/auth/login', { corpo: { email: 'aluna.teste@unifor.br', senha: 'Trocada123' } });
        assert.equal(relogin.status, 401);
    });
});
