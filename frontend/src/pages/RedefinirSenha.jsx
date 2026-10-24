import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/cliente'
import Alerta from '../components/Alerta'
import Campo from '../components/Campo'
import CartaoAuth from '../components/CartaoAuth'
import { useToast } from '../contexts/contextos'
import { validarSenha } from '../utils/validacao'

export default function RedefinirSenha() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navegar = useNavigate()
  const toast = useToast()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erros, setErros] = useState({})
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    const e = {}
    const erroSenha = validarSenha(senha)
    if (erroSenha) e.nova_senha = erroSenha
    if (senha !== confirmacao) e.confirmacao = 'As senhas não conferem.'
    setErros(e)
    if (Object.keys(e).length) return

    setEnviando(true)
    try {
      const r = await api.post('/auth/redefinir-senha', { token, nova_senha: senha })
      toast.sucesso(r.mensagem)
      navegar('/login', { replace: true })
    } catch (erro) {
      setErros(erro.erros || {})
      setMensagem(erro.message)
      setEnviando(false)
    }
  }

  return (
    <CartaoAuth titulo="Nova senha" subtitulo="Defina uma nova senha de acesso">
      {!token ? (
        <Alerta>Link inválido. Solicite uma nova recuperação de senha.</Alerta>
      ) : (
        <>
          <Alerta>{mensagem}</Alerta>
          <form onSubmit={enviar} noValidate>
            <Campo rotulo="Nova senha" type="password" autoComplete="new-password" value={senha}
              onChange={(e) => setSenha(e.target.value)} erro={erros.nova_senha} ajuda="Mínimo de 8 caracteres, com letras e números." />
            <Campo rotulo="Confirme a nova senha" type="password" autoComplete="new-password" value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)} erro={erros.confirmacao} />
            <button type="submit" className="btn btn-dark w-100 py-2" disabled={enviando}>Salvar nova senha</button>
          </form>
        </>
      )}
      <div className="text-center mt-4 small">
        <Link to="/esqueci-senha">Solicitar novo link</Link> · <Link to="/login">Voltar ao login</Link>
      </div>
    </CartaoAuth>
  )
}
