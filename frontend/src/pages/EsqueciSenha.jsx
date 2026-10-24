import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/cliente'
import Alerta from '../components/Alerta'
import Campo from '../components/Campo'
import CartaoAuth from '../components/CartaoAuth'
import { REGEX_EMAIL } from '../utils/validacao'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [resposta, setResposta] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    if (!REGEX_EMAIL.test(email.trim())) {
      setErro('Informe um e-mail válido.')
      return
    }
    setErro('')
    setEnviando(true)
    try {
      setResposta(await api.post('/auth/esqueci-senha', { email: email.trim() }))
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <CartaoAuth titulo="Recuperar senha" subtitulo="Enviaremos um link de redefinição para o seu e-mail">
      {resposta ? (
        <>
          <Alerta tipo="success">{resposta.mensagem}</Alerta>
          {resposta.link_desenvolvimento && (
            <div className="alert alert-warning small">
              <strong>Ambiente de desenvolvimento:</strong> não há servidor de e-mail configurado. Use o link abaixo
              (ele também aparece no terminal do back-end):
              <div className="mt-2">
                <Link to={new URL(resposta.link_desenvolvimento).pathname + new URL(resposta.link_desenvolvimento).search}>
                  Abrir link de redefinição
                </Link>
              </div>
            </div>
          )}
        </>
      ) : (
        <form onSubmit={enviar} noValidate>
          <Campo rotulo="E-mail cadastrado" type="email" autoComplete="email" placeholder="exemplo@instituicao.edu.br"
            value={email} onChange={(e) => setEmail(e.target.value)} erro={erro} />
          <button type="submit" className="btn btn-dark w-100 py-2" disabled={enviando}>
            {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            Enviar link
          </button>
        </form>
      )}
      <div className="text-center mt-4 small">
        <Link to="/login">Voltar ao login</Link>
      </div>
    </CartaoAuth>
  )
}
