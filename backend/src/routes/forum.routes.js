const { Router } = require('express');
const controller = require('../controllers/forum.controller');
const { autenticar } = require('../middlewares/auth');

const router = Router();

router.use(autenticar);
router.get('/topicos', controller.listar);
router.post('/topicos', controller.criar);
router.get('/topicos/:id', controller.detalhar);
router.delete('/topicos/:id', controller.excluirTopico);
router.post('/topicos/:id/respostas', controller.responder);
router.post('/topicos/:id/curtir', controller.curtirTopico);
router.post('/respostas/:id/curtir', controller.curtirResposta);
router.delete('/respostas/:id', controller.excluirResposta);
router.post('/denuncias', controller.denunciar);

module.exports = router;
