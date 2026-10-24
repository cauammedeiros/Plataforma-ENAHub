const { Router } = require('express');
const controller = require('../controllers/catalogo.controller');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = Router();

// Públicas: usadas na tela de cadastro
router.get('/cursos', controller.cursos);
router.get('/instituicoes', controller.instituicoes);
router.get('/temas', controller.temas);
router.get('/anos', controller.anos);

router.post('/cursos', autenticar, autorizar('admin'), controller.criarCurso);
router.post('/temas', autenticar, autorizar('admin', 'professor'), controller.criarTema);

module.exports = router;
