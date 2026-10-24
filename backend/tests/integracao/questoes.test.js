const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { recriarBancoDeTeste, iniciarServidor, login } = require('../helpers');

describe('Banco de questões', () => {
    let api; let encerrar; let aluno; let prof; let admin; let ads;

    const novaQuestao = (extra = {}) => ({
        enunciado: 'Questão criada no teste automatizado: qual estrutura segue a política FIFO?',
        ano: 2024,
        dificuldade: 'facil',
        curso_id: ads.id,
        alternativas: ['Fila', 'Pilha', 'Árvore', 'Grafo', 'Hash'].map((texto) => ({ texto })),
        correta: 'A',
        ...extra
    });

    before(async () => {
        await recriarBancoDeTeste();
        ({ api, encerrar } = await iniciarServidor());
        aluno = await login(api, 'aluno@enahub.demo');
        prof = await login(api, 'professor@enahub.demo');
        admin = await login(api, 'admin@enahub.demo');
        ads = (await api('GET', '/api/cursos')).corpo.find((c) => c.nome.startsWith('Análise'));
    });
    after(() => encerrar());

    test('lista paginada com filtros por curso, ano, tema e dificuldade (RF011)', async () => {
        const todas = await api('GET', '/api/questoes?limite=50', { token: aluno });
        assert.equal(todas.status, 200);
        assert.equal(todas.corpo.total, 32);

        const porCurso = await api('GET', `/api/questoes?curso_id=${ads.id}&limite=50`, { token: aluno });
        assert.equal(porCurso.corpo.total, 16);
        assert.ok(porCurso.corpo.questoes.every((q) => q.curso_id === ads.id));

        const porAno = await api('GET', '/api/questoes?ano=2018&limite=50', { token: aluno });
        assert.ok(porAno.corpo.total > 0 && porAno.corpo.questoes.every((q) => q.ano === 2018));

        const dificeis = await api('GET', '/api/questoes?dificuldade=dificil', { token: aluno });
        assert.ok(dificeis.corpo.questoes.every((q) => q.dificuldade === 'dificil'));

        const temas = await api('GET', `/api/temas?curso_id=${ads.id}`);
        const bd = temas.corpo.find((t) => t.nome === 'Banco de Dados');
        const porTema = await api('GET', `/api/questoes?tema_id=${bd.id}`, { token: aluno });
        assert.equal(porTema.corpo.total, 3);

        const busca = await api('GET', '/api/questoes?busca=HTTPS', { token: aluno });
        assert.equal(busca.corpo.total, 1);

        const invalido = await api('GET', '/api/questoes?dificuldade=impossivel', { token: aluno });
        assert.equal(invalido.status, 400);
    });

    test('aluno não recebe a alternativa correta nem os comentários na consulta', async () => {
        const lista = await api('GET', '/api/questoes?limite=1', { token: aluno });
        const r = await api('GET', `/api/questoes/${lista.corpo.questoes[0].id}`, { token: aluno });
        assert.equal(r.status, 200);
        assert.equal(r.corpo.alternativas.length, 5);
        assert.ok(r.corpo.alternativas.every((a) => !('correta' in a)));
        assert.equal(r.corpo.comentarios, undefined);
        assert.equal(r.corpo.oficial_enade, false);
        assert.match(r.corpo.fonte, /Não é questão oficial do ENADE/);
    });

    test('modo prática corrige a resposta e mostra o comentário', async () => {
        const lista = await api('GET', '/api/questoes?busca=HTTPS', { token: aluno });
        const id = lista.corpo.questoes[0].id;
        const q = await api('GET', `/api/questoes/${id}`, { token: aluno });
        const d = q.corpo.alternativas.find((a) => a.letra === 'D');
        const r = await api('POST', `/api/questoes/${id}/responder`, { token: aluno, corpo: { alternativa_id: d.id } });
        assert.equal(r.status, 200);
        assert.equal(r.corpo.acertou, true);
        assert.equal(r.corpo.letra_correta, 'D');
        assert.ok(r.corpo.comentarios.length >= 1);
    });

    test('professor cadastra questão pendente; aluno não a vê até o admin aprovar (RF006, RF031)', async () => {
        const criada = await api('POST', '/api/questoes', { token: prof, corpo: novaQuestao() });
        assert.equal(criada.status, 201);
        assert.equal(criada.corpo.questao.status, 'pendente');
        const id = criada.corpo.questao.id;

        assert.equal((await api('GET', `/api/questoes/${id}`, { token: aluno })).status, 404);
        const pendentes = await api('GET', '/api/questoes?status=pendente', { token: admin });
        assert.ok(pendentes.corpo.questoes.some((q) => q.id === id));

        const aprovada = await api('PATCH', `/api/questoes/${id}/status`, { token: admin, corpo: { status: 'aprovada' } });
        assert.equal(aprovada.status, 200);
        assert.equal((await api('GET', `/api/questoes/${id}`, { token: aluno })).status, 200);
    });

    test('validação do cadastro de questão', async () => {
        const r = await api('POST', '/api/questoes', {
            token: prof,
            corpo: novaQuestao({ enunciado: '', correta: 'F', alternativas: [{ texto: 'só uma' }], dificuldade: 'x' })
        });
        assert.equal(r.status, 400);
        for (const campo of ['enunciado', 'correta', 'alternativas', 'dificuldade']) assert.ok(r.corpo.erros[campo], campo);

        const oficialSemAno = await api('POST', '/api/questoes', { token: admin, corpo: novaQuestao({ oficial_enade: true, ano: null }) });
        assert.equal(oficialSemAno.status, 400);
    });

    test('professor não edita questão de outro autor; edição própria volta para aprovação', async () => {
        // Questão da seed (autor: administrador)
        const daSeed = (await api('GET', '/api/questoes?busca=HTTPS', { token: aluno })).corpo.questoes[0];
        assert.notEqual(daSeed.criado_por, (await api('GET', '/api/auth/me', { token: prof })).corpo.usuario.id);
        const r = await api('PUT', `/api/questoes/${daSeed.id}`, { token: prof, corpo: novaQuestao() });
        assert.equal(r.status, 403);

        const criada = await api('POST', '/api/questoes', { token: prof, corpo: novaQuestao() });
        const id = criada.corpo.questao.id;
        await api('PATCH', `/api/questoes/${id}/status`, { token: admin, corpo: { status: 'aprovada' } });
        const editada = await api('PUT', `/api/questoes/${id}`, { token: prof, corpo: novaQuestao({ correta: 'B' }) });
        assert.equal(editada.status, 200);
        assert.equal(editada.corpo.questao.status, 'pendente');
        assert.equal(editada.corpo.questao.alternativas.find((a) => a.correta).letra, 'B');
    });

    test('exclusão: remove questão sem uso e arquiva questão usada em simulado', async () => {
        const livre = await api('POST', '/api/questoes', { token: admin, corpo: novaQuestao() });
        const r1 = await api('DELETE', `/api/questoes/${livre.corpo.questao.id}`, { token: admin });
        assert.equal(r1.status, 200);
        assert.equal(r1.corpo.arquivada, false);
        assert.equal((await api('GET', `/api/questoes/${livre.corpo.questao.id}`, { token: admin })).status, 404);

        // A questão do simulado oficial de demonstração está em uso
        const db = require('../../src/database');
        const [[usada]] = await db.query('SELECT questao_id FROM modelo_simulado_questoes LIMIT 1');
        const r2 = await api('DELETE', `/api/questoes/${usada.questao_id}`, { token: admin });
        assert.equal(r2.status, 200);
        assert.equal(r2.corpo.arquivada, true);
        assert.equal((await api('GET', `/api/questoes/${usada.questao_id}`, { token: aluno })).status, 404);
    });

    test('favoritar, listar e desfavoritar (RF012)', async () => {
        const q = (await api('GET', '/api/questoes?limite=2', { token: aluno })).corpo.questoes;
        await api('POST', `/api/questoes/${q[0].id}/favorito`, { token: aluno });
        await api('POST', `/api/questoes/${q[0].id}/favorito`, { token: aluno });
        await api('POST', `/api/questoes/${q[1].id}/favorito`, { token: aluno });
        let favs = await api('GET', '/api/questoes/favoritas', { token: aluno });
        assert.equal(favs.corpo.length, 2);

        const filtrada = await api('GET', '/api/questoes?favoritas=true', { token: aluno });
        assert.equal(filtrada.corpo.total, 2);

        await api('DELETE', `/api/questoes/${q[0].id}/favorito`, { token: aluno });
        favs = await api('GET', '/api/questoes/favoritas', { token: aluno });
        assert.deepEqual(favs.corpo.map((f) => f.id), [q[1].id]);
    });

    test('professor vê o gabarito e comenta questão de outro autor; aluno não vê o gabarito', async () => {
        const daSeed = (await api('GET', '/api/questoes?busca=HTTPS', { token: aluno })).corpo.questoes[0];
        const comoProf = await api('GET', `/api/questoes/${daSeed.id}`, { token: prof });
        assert.equal(comoProf.corpo.pode_editar, false);
        assert.equal(comoProf.corpo.pode_comentar, true);
        assert.equal(comoProf.corpo.alternativas.filter((a) => a.correta).length, 1);
        const c = await api('POST', `/api/questoes/${daSeed.id}/comentarios`, { token: prof, corpo: { texto: 'Dica do professor: HTTPS = HTTP + TLS.' } });
        assert.equal(c.status, 201);
        const comoAluno = await api('GET', `/api/questoes/${daSeed.id}`, { token: aluno });
        assert.equal(comoAluno.corpo.pode_comentar, false);
        assert.ok(comoAluno.corpo.alternativas.every((a) => !('correta' in a)));
    });

    test('categorias: admin cadastra curso e tema; duplicados e aluno são recusados', async () => {
        const curso = await api('POST', '/api/cursos', { token: admin, corpo: { nome: 'Enfermagem' } });
        assert.equal(curso.status, 201);
        assert.equal((await api('POST', '/api/cursos', { token: admin, corpo: { nome: 'ENFERMAGEM' } })).status, 409);
        assert.equal((await api('POST', '/api/cursos', { token: aluno, corpo: { nome: 'Medicina' } })).status, 403);
        assert.equal((await api('POST', '/api/cursos', { token: prof, corpo: { nome: 'Medicina' } })).status, 403);
        const tema = await api('POST', '/api/temas', { token: prof, corpo: { nome: 'Saúde Coletiva', curso_id: curso.corpo.id } });
        assert.equal(tema.status, 201);
        assert.equal((await api('POST', '/api/temas', { token: admin, corpo: { nome: 'saude coletiva', curso_id: curso.corpo.id } })).status, 409);
    });

    test('professor adiciona comentário com mídia (RF024, RF025)', async () => {
        const q = (await api('GET', '/api/questoes?limite=1', { token: aluno })).corpo.questoes[0];
        const r = await api('POST', `/api/questoes/${q.id}/comentarios`, {
            token: prof,
            corpo: { texto: 'Veja também o vídeo de revisão.', video_url: 'https://www.youtube.com/watch?v=exemplo' }
        });
        assert.equal(r.status, 201);
        const invalida = await api('POST', `/api/questoes/${q.id}/comentarios`, {
            token: prof, corpo: { texto: 'Imagem inválida', imagem_url: 'javascript:alert(1)' }
        });
        assert.equal(invalida.status, 400);
        assert.equal((await api('POST', `/api/questoes/${q.id}/comentarios`, { token: aluno, corpo: { texto: 'oi oi' } })).status, 403);
    });
});
