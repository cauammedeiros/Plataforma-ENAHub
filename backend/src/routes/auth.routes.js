const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth');
const limiteTentativas = require('../middlewares/limiteTentativas');

const router = Router();
const limite = limiteTentativas({ maximo: 10, janelaMinutos: 15 });

router.post('/cadastro', limite, controller.cadastrar);
router.post('/login', limite, controller.login);
router.post('/esqueci-senha', limite, controller.esqueciSenha);
router.post('/redefinir-senha', limite, controller.redefinirSenha);
router.post('/logout', autenticar, controller.logout);
router.get('/me', autenticar, controller.eu);

module.exports = router;
