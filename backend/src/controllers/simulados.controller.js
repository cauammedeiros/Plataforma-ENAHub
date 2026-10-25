const simuladosService = require('../services/simulados.service');
const { Validador, idParam } = require('../utils/validacao');

const LIMITES = { questoesMin: 1, questoesMax: 80, tempoMin: 5, tempoMax: 300 };

async function criar(req, res) {
    const v = new Validador(req.body);
    const modeloId = v.inteiro('modelo_id', { obrigatorio: false, min: 1 });
    const opcoes = { modeloId };
    if (!modeloId) {
        opcoes.quantidade = v.inteiro('quantidade', {
            min: LIMITES.questoesMin, max: LIMITES.questoesMax, rotulo: 'Quantidade de questões'
        });
        opcoes.tempoMinutos = v.inteiro('tempo_minutos', {
            min: LIMITES.tempoMin, max: LIMITES.tempoMax, rotulo: 'Tempo (minutos)'
        });
        opcoes.cursoId = v.inteiro('curso_id', { obrigatorio: false, min: 1 });
        opcoes.temaId = v.inteiro('tema_id', { obrigatorio: false, min: 1 });
        opcoes.dificuldade = v.opcao('dificuldade', ['facil', 'media', 'dificil'], { obrigatorio: false });
    }
    v.verificar();

    const simulado = await simuladosService.criar(req.usuario, opcoes);
    res.status(201).json({ mensagem: 'Simulado iniciado. Boa prova!', simulado });
}

async function emAndamento(req, res) {
    res.json({ simulado: await simuladosService.buscarEmAndamento(req.usuario.id) });
}

async function obter(req, res) {
    res.json(await simuladosService.obter(req.usuario, idParam(req.params.id)));
}

async function salvarResposta(req, res) {
    const alternativa = req.body.alternativa_id;
    let alternativaId = null;
    if (alternativa !== null && alternativa !== undefined) {
        const v = new Validador(req.body);
        alternativaId = v.inteiro('alternativa_id', { min: 1, rotulo: 'Alternativa' });
        v.verificar();
    }
    res.json(await simuladosService.salvarResposta(
        req.usuario, idParam(req.params.id), idParam(req.params.questaoId), alternativaId
    ));
}

async function finalizar(req, res) {
    const resultado = await simuladosService.finalizar(req.usuario, idParam(req.params.id));
    res.json({ mensagem: 'Simulado finalizado.', ...resultado });
}

async function resultado(req, res) {
    res.json(await simuladosService.resultado(req.usuario, idParam(req.params.id)));
}

async function historico(req, res) {
    res.json(await simuladosService.historico(req.usuario.id));
}

async function modelos(req, res) {
    res.json(await simuladosService.listarModelos());
}

module.exports = { LIMITES, criar, emAndamento, obter, salvarResposta, finalizar, resultado, historico, modelos };
