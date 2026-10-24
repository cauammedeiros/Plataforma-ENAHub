const desempenhoService = require('../services/desempenho.service');
const { Validador } = require('../utils/validacao');

async function resumo(req, res) {
    res.json(await desempenhoService.resumo(req.usuario.id));
}

async function ranking(req, res) {
    const v = new Validador(req.query);
    const cursoId = v.inteiro('curso_id', { obrigatorio: false, min: 1 });
    v.verificar();
    res.json(await desempenhoService.ranking(req.usuario.id, cursoId));
}

module.exports = { resumo, ranking };
