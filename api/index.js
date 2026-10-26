// Ponto de entrada da API na Vercel: o mesmo app Express do back-end, executado
// como uma Vercel Function. O vercel.json encaminha todas as rotas /api/* para cá.
// Localmente nada muda: o back-end continua iniciando por backend/src/server.js.
module.exports = require('../backend/src/app');
