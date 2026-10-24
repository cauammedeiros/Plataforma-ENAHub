export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mesmas regras do back-end (backend/src/utils/validacao.js)
export function validarSenha(senha) {
  if (!senha) return 'Crie uma senha.'
  if (senha.length < 8 || senha.length > 72) return 'A senha deve ter entre 8 e 72 caracteres.'
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return 'A senha deve conter letras e números.'
  return null
}
