const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { recriarBancoDeTeste, iniciarServidor, login } = require('../helpers');

describe('Simulados: execução, salvamento, tempo e correção (RF013–RF019, RF023)', () => {
    let api; let encerrar; let aluno; let outro; let ads; let db;

    async function corretas(questaoIds) {
        const [linhas] = await db.query(
            'SELECT questao_id, id FROM alternativas WHERE correta = 1 AND questao_id IN (?)', [questaoIds]
        );
        return Object.fromEntries(linhas.map((l) => [l.questao_id, l.id]));
    }

    async function iniciar(token, corpo) {
        const r = await api('POST', '/api/simulados', { token, corpo });
        assert.equal(r.status, 201, JSON.stringify(r.corpo));
        return r.corpo.simulado.id;
    }

    async function vencerPrazo(id) {
        await db.query('UPDATE simulados SET data_inicio = ?, data_limite = ? WHERE id = ?',
            [new Date(Date.now() - 3600_000), new Date(Date.now() - 60_000), id]);
    }

    before(async () => {
        await recriarBancoDeTeste();
        ({ api, encerrar } = await iniciarServidor());
        db = require('../../src/database');
        aluno = await login(api, 'aluno@enahub.demo');
        outro = await login(api, 'rafael@enahub.demo');
        ads = (await api('GET', '/api/cursos')).corpo.find((c) => c.nome.startsWith('Análise'));
    });
    after(() => encerrar());

    test('valida quantidade e tempo; recusa quantidade maior que a disponível', async () => {
        const invalido = await api('POST', '/api/simulados', { token: aluno, corpo: { quantidade: 0, tempo_minutos: 1 } });
        assert.equal(invalido.status, 400);
        assert.ok(invalido.corpo.erros.quantidade && invalido.corpo.erros.tempo_minutos);

        const demais = await api('POST', '/api/simulados', {
            token: aluno, corpo: { quantidade: 40, tempo_minutos: 60, curso_id: ads.id }
        });
        assert.equal(demais.status, 422);
        assert.equal(demais.corpo.erros.disponiveis, 16);
    });

    test('fluxo completo: 10 questões, 6 certas, 2 erradas, 2 em branco', async () => {
        const id = await iniciar(aluno, { quantidade: 10, tempo_minutos: 30, curso_id: ads.id });

        // Não pode haver dois simulados em andamento
        const segundo = await api('POST', '/api/simulados', { token: aluno, corpo: { quantidade: 5, tempo_minutos: 10 } });
        assert.equal(segundo.status, 409);
        assert.equal(segundo.corpo.erros.simulado_id, id);

        const prova = await api('GET', `/api/simulados/${id}`, { token: aluno });
        assert.equal(prova.status, 200);
        assert.equal(prova.corpo.questoes.length, 10);
        assert.ok(prova.corpo.tempo_restante_segundos > 29 * 60 && prova.corpo.tempo_restante_segundos <= 30 * 60);
        assert.equal(new Set(prova.corpo.questoes.map((q) => q.id)).size, 10, 'sem questões repetidas');
        // Gabarito não pode vazar antes do fim: nenhuma alternativa/questão traz campos de correção
        for (const q of prova.corpo.questoes) {
            assert.deepEqual(Object.keys(q).filter((k) => ['acertou', 'correta', 'comentarios'].includes(k)), []);
            for (const a of q.alternativas) assert.deepEqual(Object.keys(a).sort(), ['id', 'letra', 'texto']);
        }
        assert.ok(prova.corpo.questoes.every((q) => q.curso.startsWith('Análise')));

        const gabarito = await corretas(prova.corpo.questoes.map((q) => q.id));
        for (const [i, q] of prova.corpo.questoes.entries()) {
            if (i >= 8) continue; // 2 em branco
            const certa = gabarito[q.id];
            const errada = q.alternativas.find((a) => a.id !== certa).id;
            // Responde errado primeiro e depois troca: deve valer a última resposta
            await api('PUT', `/api/simulados/${id}/respostas/${q.id}`, { token: aluno, corpo: { alternativa_id: errada } });
            const final = i < 6 ? certa : errada;
            const r = await api('PUT', `/api/simulados/${id}/respostas/${q.id}`, { token: aluno, corpo: { alternativa_id: final } });
            assert.equal(r.status, 200);
        }

        // Persistência: ao "recarregar a página" as respostas continuam lá
        const recarregada = await api('GET', `/api/simulados/${id}`, { token: aluno });
        assert.equal(recarregada.corpo.questoes.filter((q) => q.resposta !== null).length, 8);
        const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM respostas WHERE simulado_id = ?', [id]);
        assert.equal(total, 8);

        // Gabarito indisponível antes de finalizar
        assert.equal((await api('GET', `/api/simulados/${id}/resultado`, { token: aluno })).status, 409);
        // Outro aluno não acessa
        assert.equal((await api('GET', `/api/simulados/${id}`, { token: outro })).status, 404);
        assert.equal((await api('POST', `/api/simulados/${id}/finalizar`, { token: outro })).status, 404);

        const fim = await api('POST', `/api/simulados/${id}/finalizar`, { token: aluno });
        assert.equal(fim.status, 200);
        assert.equal(fim.corpo.finalizado_por, 'usuario');

        const res = await api('GET', `/api/simulados/${id}/resultado`, { token: aluno });
        assert.equal(res.status, 200);
        assert.equal(res.corpo.total, 10);
        assert.equal(res.corpo.acertos, 6);
        assert.equal(res.corpo.erros, 2);
        assert.equal(res.corpo.em_branco, 2);
        assert.equal(res.corpo.percentual, 60);
        assert.equal(res.corpo.nota, 6);
        assert.equal(res.corpo.gabarito.length, 10);
        assert.equal(res.corpo.por_tema.reduce((s, t) => s + t.total, 0), 10);
        for (const q of res.corpo.gabarito) {
            assert.equal(q.alternativas.filter((a) => a.correta).length, 1);
            assert.ok(q.comentarios.length >= 1, 'gabarito comentado');
        }
        assert.equal(res.corpo.gabarito.filter((q) => q.acertou === null).length, 2);

        // Depois de finalizado, não aceita alterar respostas
        const q0 = prova.corpo.questoes[0];
        const tarde = await api('PUT', `/api/simulados/${id}/respostas/${q0.id}`, {
            token: aluno, corpo: { alternativa_id: q0.alternativas[0].id }
        });
        assert.equal(tarde.status, 409);
    });

    test('finalizar duas vezes (inclusive em paralelo) não gera dois resultados', async () => {
        const id = await iniciar(aluno, { quantidade: 4, tempo_minutos: 10 });
        const prova = await api('GET', `/api/simulados/${id}`, { token: aluno });
        const gabarito = await corretas(prova.corpo.questoes.map((q) => q.id));
        const q = prova.corpo.questoes[0];
        await api('PUT', `/api/simulados/${id}/respostas/${q.id}`, { token: aluno, corpo: { alternativa_id: gabarito[q.id] } });

        const respostas = await Promise.all([1, 2, 3].map(() => api('POST', `/api/simulados/${id}/finalizar`, { token: aluno })));
        assert.ok(respostas.every((r) => r.status === 200));
        assert.equal(respostas.filter((r) => r.corpo.ja_finalizado === false).length, 1);

        const res = await api('GET', `/api/simulados/${id}/resultado`, { token: aluno });
        assert.deepEqual([res.corpo.acertos, res.corpo.erros, res.corpo.em_branco, res.corpo.nota], [1, 0, 3, 2.5]);
        const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM simulados WHERE id = ?', [id]);
        assert.equal(total, 1);
    });

    test('simulado sem nenhuma resposta: nota 0 e todas em branco', async () => {
        const id = await iniciar(aluno, { quantidade: 3, tempo_minutos: 5 });
        await api('POST', `/api/simulados/${id}/finalizar`, { token: aluno });
        const res = await api('GET', `/api/simulados/${id}/resultado`, { token: aluno });
        assert.deepEqual([res.corpo.acertos, res.corpo.erros, res.corpo.em_branco, res.corpo.percentual, res.corpo.nota],
            [0, 0, 3, 0, 0]);
    });

    test('tempo esgotado: servidor finaliza sozinho e recusa novas respostas (RF016, RF017)', async () => {
        const id = await iniciar(aluno, { quantidade: 5, tempo_minutos: 10 });
        const prova = await api('GET', `/api/simulados/${id}`, { token: aluno });
        const gabarito = await corretas(prova.corpo.questoes.map((q) => q.id));
        for (const q of prova.corpo.questoes.slice(0, 2)) {
            await api('PUT', `/api/simulados/${id}/respostas/${q.id}`, { token: aluno, corpo: { alternativa_id: gabarito[q.id] } });
        }

        await vencerPrazo(id);
        const q = prova.corpo.questoes[2];
        const tarde = await api('PUT', `/api/simulados/${id}/respostas/${q.id}`, { token: aluno, corpo: { alternativa_id: gabarito[q.id] } });
        assert.equal(tarde.status, 409);
        assert.equal(tarde.corpo.erros.finalizado, true);

        const res = await api('GET', `/api/simulados/${id}/resultado`, { token: aluno });
        assert.equal(res.corpo.finalizado_por, 'tempo');
        assert.deepEqual([res.corpo.acertos, res.corpo.em_branco, res.corpo.nota], [2, 3, 4]);
    });

    test('rotina periódica finaliza simulados abandonados', async () => {
        const id = await iniciar(outro, { quantidade: 2, tempo_minutos: 5 });
        await vencerPrazo(id);
        const { finalizarExpirados } = require('../../src/services/simulados.service');
        assert.equal(await finalizarExpirados(), 1);
        const [[s]] = await db.query('SELECT status, finalizado_por, nota FROM simulados WHERE id = ?', [id]);
        assert.deepEqual([s.status, s.finalizado_por, Number(s.nota)], ['finalizado', 'tempo', 0]);
        assert.equal(await finalizarExpirados(), 0, 'não finaliza de novo');
    });

    test('ao abrir um simulado vencido, ele é finalizado e o cliente é avisado', async () => {
        const id = await iniciar(aluno, { quantidade: 2, tempo_minutos: 5 });
        await vencerPrazo(id);
        const r = await api('GET', `/api/simulados/${id}`, { token: aluno });
        assert.equal(r.corpo.status, 'finalizado');
        assert.equal(r.corpo.questoes, undefined);
        assert.equal((await api('GET', '/api/simulados/em-andamento', { token: aluno })).corpo.simulado, null);
    });

    test('rejeita alternativa de outra questão e questão fora do simulado', async () => {
        const id = await iniciar(aluno, { quantidade: 2, tempo_minutos: 5 });
        const prova = await api('GET', `/api/simulados/${id}`, { token: aluno });
        const [q1, q2] = prova.corpo.questoes;
        const r = await api('PUT', `/api/simulados/${id}/respostas/${q1.id}`, { token: aluno, corpo: { alternativa_id: q2.alternativas[0].id } });
        assert.equal(r.status, 400);

        const [[fora]] = await db.query('SELECT id FROM questoes WHERE id NOT IN (?, ?) LIMIT 1', [q1.id, q2.id]);
        const r2 = await api('PUT', `/api/simulados/${id}/respostas/${fora.id}`, { token: aluno, corpo: { alternativa_id: 1 } });
        assert.equal(r2.status, 400);

        // Durante o simulado, o modo prática não revela a resposta dessas questões
        const pratica = await api('POST', `/api/questoes/${q1.id}/responder`, { token: aluno, corpo: { alternativa_id: q1.alternativas[0].id } });
        assert.equal(pratica.status, 409);

        // Desmarcar resposta (null) remove o registro
        await api('PUT', `/api/simulados/${id}/respostas/${q1.id}`, { token: aluno, corpo: { alternativa_id: q1.alternativas[0].id } });
        await api('PUT', `/api/simulados/${id}/respostas/${q1.id}`, { token: aluno, corpo: { alternativa_id: null } });
        const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM respostas WHERE simulado_id = ?', [id]);
        assert.equal(total, 0);
        await api('POST', `/api/simulados/${id}/finalizar`, { token: aluno });
    });

    test('simulado oficial criado pelo admin (RF032)', async () => {
        const oficiais = await api('GET', '/api/simulados/oficiais', { token: aluno });
        assert.equal(oficiais.corpo.length, 1);
        const modelo = oficiais.corpo[0];
        const r = await api('POST', '/api/simulados', { token: aluno, corpo: { modelo_id: modelo.id } });
        assert.equal(r.status, 201);
        assert.equal(r.corpo.simulado.quantidade_questoes, 10);
        assert.equal(r.corpo.simulado.tempo_minutos, 30);
        await api('POST', `/api/simulados/${r.corpo.simulado.id}/finalizar`, { token: aluno });
    });

    test('histórico, estatísticas e ranking refletem os simulados (RF020–RF022)', async () => {
        const hist = await api('GET', '/api/simulados', { token: aluno });
        assert.ok(hist.corpo.length >= 6);
        assert.ok(hist.corpo.every((s) => s.status === 'finalizado'));

        const resumo = await api('GET', '/api/desempenho/resumo', { token: aluno });
        assert.equal(resumo.status, 200);
        assert.equal(resumo.corpo.total_simulados, hist.corpo.length);
        assert.ok(resumo.corpo.evolucao.length > 0);
        assert.ok(resumo.corpo.por_tema.length > 0);
        assert.ok(resumo.corpo.dias_seguidos >= 1);
        assert.equal(resumo.corpo.questoes_disponiveis, 32);

        const ranking = await api('GET', '/api/desempenho/ranking', { token: aluno });
        assert.ok(ranking.corpo.ranking.length >= 3);
        assert.ok(ranking.corpo.minha_posicao);
        const medias = ranking.corpo.ranking.map((r) => r.media_percentual);
        assert.deepEqual(medias, [...medias].sort((a, b) => b - a));
    });
});
