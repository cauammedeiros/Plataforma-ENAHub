const catalogo = require('../services/catalogo.service');
const { Validador } = require('../utils/validacao');

async function cursos(req, res) {
    res.json(await catalogo.listarCursos());
}

async function instituicoes(req, res) {
    res.json(await catalogo.listarInstituicoes());
}

async function temas(req, res) {
    const v = new Validador(req.query);
    const cursoId = v.inteiro('curso_id', { obrigatorio: false, min: 1 });
    v.verificar();
    res.json(await catalogo.listarTemas(cursoId));
}

async function anos(req, res) {
    res.json(await catalogo.listarAnos());
}

async function criarCurso(req, res) {
    const v = new Validador(req.body);
    const nome = v.texto('nome', { min: 2, max: 100, rotulo: 'Nome' });
    v.verificar();
    res.status(201).json(await catalogo.criarCurso(nome));
}

async function criarTema(req, res) {
    const v = new Validador(req.body);
    const nome = v.texto('nome', { min: 2, max: 100, rotulo: 'Nome' });
    const cursoId = v.inteiro('curso_id', { obrigatorio: false, min: 1, rotulo: 'Curso' });
    v.verificar();
    res.status(201).json(await catalogo.criarTema(nome, cursoId));
}

module.exports = { cursos, instituicoes, temas, anos, criarCurso, criarTema };
