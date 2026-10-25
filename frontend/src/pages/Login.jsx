import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Alerta from '../components/Alerta'
import Campo from '../components/Campo'
import CartaoAuth from '../components/CartaoAuth'
import { REGEX_EMAIL } from '../utils/validacao'
import { useAuth, useToast } from '../contexts/contextos'

export default function Login() {
  const { entrar } = useAuth()
  const toast = useToast()
  const navegar = useNavigate()
  const local = useLocation()
  const [form, setForm] = useState({ email: '', senha: '' })
  const [erros, setErros] = useState({})
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  function validar() {
    const e = {}
    if (!form.email.trim()) e.email = 'Informe seu e-mail.'
    else if (!REGEX_EMAIL.test(form.email.trim())) e.email = 'Informe um e-mail válido.'
    if (!form.senha) e.senha = 'Informe sua senha.'
    return e
  }

  async function enviar(evento) {
    evento.preventDefault()
    const e = validar()
    setErros(e)
    setMensagem('')
    if (Object.keys(e).length) return

    setEnviando(true)
    try {
      const r = await entrar(form.email.trim(), form.senha)
      toast.sucesso(r.mensagem)
      navegar(local.state?.de || '/', { replace: true })
    } catch (erro) {
      setErros(erro.erros || {})
      setMensagem(erro.message)
      setEnviando(false)
    }
  }

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  return (
    <CartaoAuth titulo="ENAHub" subtitulo="Acesse sua área de estudos acadêmicos">
      <Alerta>{mensagem}</Alerta>
      <form onSubmit={enviar} noValidate>
        <Campo rotulo="E-mail" type="email" autoComplete="email" placeholder="exemplo@instituicao.edu.br"
          value={form.email} onChange={alterar('email')} erro={erros.email} />
        <Campo rotulo="Senha" type="password" autoComplete="current-password" placeholder="Digite sua senha de acesso"
          value={form.senha} onChange={alterar('senha')} erro={erros.senha} />
        <button type="submit" className="btn btn-dark w-100 py-2" disabled={enviando}>
          {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Entrar
        </button>
      </form>
      <div className="text-center mt-4 small d-flex flex-column gap-2">
        <Link to="/esqueci-senha">Esqueci minha senha</Link>
        <Link to="/cadastro">Criar conta</Link>
      </div>
    </CartaoAuth>
  )
}
