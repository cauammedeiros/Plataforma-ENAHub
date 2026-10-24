const { Router } = require('express');
const controller = require('../controllers/usuarios.controller');
const { autenticar } = require('../middlewares/auth');

const router = Router();

router.use(autenticar);
router.put('/me', controller.atualizarPerfil);
router.delete('/me', controller.excluirConta);

module.exports = router;
