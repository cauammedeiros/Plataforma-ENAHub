const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { recriarBancoDeTeste, iniciarServidor, login } = require('../helpers');

describe('Fórum, moderação e relatórios (RF026–RF030, RF033)', () => {
    let api; let encerrar; let aluno; let bruna; let admin;

    before(async () => {
        await recriarBancoDeTeste();
        ({ api, encerrar } = await iniciarServidor());
        aluno = await login(api, 'aluno@enahub.demo');
        bruna = await login(api, 'bruna@enahub.demo');
        admin = await login(api, 'admin@enahub.demo');
    });
    after(() => encerrar());

    test('criar tópico, responder, curtir e buscar', async () => {
        const invalido = await api('POST', '/api/forum/topicos', { token: aluno, corpo: { titulo: 'oi', conteudo: '' } });
        assert.equal(invalido.status, 400);

        const t = await api('POST', '/api/forum/topicos', {
            token: aluno, corpo: { titulo: 'Grupo de estudos de Redes', conteudo: 'Quem quer revisar TCP/UDP no sábado?' }
        });
        assert.equal(t.status, 201);

        const r = await api('POST', `/api/forum/topicos/${t.corpo.id}/respostas`, { token: bruna, corpo: { conteudo: 'Eu quero!' } });
        assert.equal(r.status, 201);

        const curtir = await api('POST', `/api/forum/respostas/${r.corpo.id}/curtir`, { token: aluno });
        assert.deepEqual(curtir.corpo, { curtido: true, curtidas: 1 });
        const descurtir = await api('POST', `/api/forum/respostas/${r.corpo.id}/curtir`, { token: aluno });
        assert.deepEqual(descurtir.corpo, { curtido: false, curtidas: 0 });
        await api('POST', `/api/forum/topicos/${t.corpo.id}/curtir`, { token: bruna });

        const detalhe = await api('GET', `/api/forum/topicos/${t.corpo.id}`, { token: bruna });
        assert.equal(detalhe.corpo.respostas.length, 1);
        assert.equal(detalhe.corpo.curtidas, 1);
        assert.equal(detalhe.corpo.curtido, true);

        const busca = await api('GET', '/api/forum/topicos?busca=Redes', { token: aluno });
        assert.equal(busca.corpo.total, 1);
        assert.equal(busca.corpo.topicos[0].respostas, 1);
    });

    test('denúncia procedente oculta o conteúdo; denúncia repetida é bloqueada', async () => {
        const t = await api('POST', '/api/forum/topicos', {
            token: bruna, corpo: { titulo: 'Conteúdo inadequado aqui', conteudo: 'Texto que será denunciado no teste.' }
        });
        const d = await api('POST', '/api/forum/denuncias', { token: aluno, corpo: { tipo: 'topico', id: t.corpo.id, motivo: 'Spam no fórum' } });
        assert.equal(d.status, 201);
        const repetida = await api('POST', '/api/forum/denuncias', { token: aluno, corpo: { tipo: 'topico', id: t.corpo.id, motivo: 'Spam de novo' } });
        assert.equal(repetida.status, 409);

        assert.equal((await api('GET', '/api/admin/denuncias', { token: aluno })).status, 403);
        const fila = await api('GET', '/api/admin/denuncias', { token: admin });
        const denuncia = fila.corpo.find((x) => x.topico_id === t.corpo.id);
        assert.equal(denuncia.tipo, 'topico');

        const analise = await api('PATCH', `/api/admin/denuncias/${denuncia.id}`, { token: admin, corpo: { status: 'procedente' } });
        assert.equal(analise.status, 200);
        assert.equal((await api('GET', `/api/forum/topicos/${t.corpo.id}`, { token: aluno })).status, 404);
        const lista = await api('GET', '/api/forum/topicos', { token: aluno });
        assert.ok(!lista.corpo.topicos.some((x) => x.id === t.corpo.id));

        const deNovo = await api('PATCH', `/api/admin/denuncias/${denuncia.id}`, { token: admin, corpo: { status: 'improcedente' } });
        assert.equal(deNovo.status, 409);
    });

    test('só o autor ou o admin excluem um tópico', async () => {
        const t = await api('POST', '/api/forum/topicos', { token: bruna, corpo: { titulo: 'Tópico da Bruna', conteudo: 'Conteúdo do tópico da Bruna.' } });
        assert.equal((await api('DELETE', `/api/forum/topicos/${t.corpo.id}`, { token: aluno })).status, 403);
        assert.equal((await api('DELETE', `/api/forum/topicos/${t.corpo.id}`, { token: bruna })).status, 200);
    });

    test('relatórios gerais para o administrador', async () => {
        const r = await api('GET', '/api/admin/relatorios', { token: admin });
        assert.equal(r.status, 200);
        assert.equal(r.corpo.usuarios.total, 5);
        assert.equal(r.corpo.questoes.aprovadas, 32);
        assert.equal(r.corpo.simulados.finalizados, 2);
        assert.ok(r.corpo.acessos_14_dias.length >= 1);
        assert.ok(r.corpo.desempenho_por_curso.length >= 1);
    });

    test('admin não pode bloquear a si mesmo; pode promover a professor', async () => {
        const lista = await api('GET', '/api/admin/usuarios', { token: admin });
        const eu = lista.corpo.find((u) => u.email === 'admin@enahub.demo');
        assert.equal((await api('PATCH', `/api/admin/usuarios/${eu.id}`, { token: admin, corpo: { bloqueado: true } })).status, 400);

        const rafael = lista.corpo.find((u) => u.email === 'rafael@enahub.demo');
        const r = await api('PATCH', `/api/admin/usuarios/${rafael.id}`, { token: admin, corpo: { perfil: 'professor' } });
        assert.equal(r.status, 200);
        const tokenRafael = await login(api, 'rafael@enahub.demo');
        const me = await api('GET', '/api/auth/me', { token: tokenRafael });
        assert.equal(me.corpo.usuario.perfil, 'professor');
    });
});
