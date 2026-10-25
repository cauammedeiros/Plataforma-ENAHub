const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth');
const limiteTentativas = require('../middlewares/limiteTentativas');

const router = Router();
// Login/cadastro/redefinição: até 10 tentativas com erro por IP + e-mail a cada 15 min
const limiteFalhas = limiteTentativas({ maximo: 10, janelaMinutos: 15 });
// Pedido de recuperação sempre responde 200 (não revela e-mails): conta todos os pedidos
const limiteRecuperacao = limiteTentativas({ maximo: 5, janelaMinutos: 15, contarTodas: true });

router.post('/cadastro', limiteFalhas, controller.cadastrar);
router.post('/login', limiteFalhas, controller.login);
router.post('/esqueci-senha', limiteRecuperacao, controller.esqueciSenha);
router.post('/redefinir-senha', limiteFalhas, controller.redefinirSenha);
router.post('/logout', autenticar, controller.logout);
router.get('/me', autenticar, controller.eu);

module.exports = router;
