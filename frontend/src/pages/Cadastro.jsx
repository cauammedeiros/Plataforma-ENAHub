import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Alerta from '../components/Alerta'
import Campo from '../components/Campo'
import CartaoAuth from '../components/CartaoAuth'
import { useAuth, useToast } from '../contexts/contextos'
import { useRequisicao } from '../hooks/useRequisicao'
import { REGEX_EMAIL, validarSenha } from '../utils/validacao'

export default function Cadastro() {
  const { cadastrar } = useAuth()
  const toast = useToast()
  const navegar = useNavigate()
  const cursos = useRequisicao('/cursos')
  const instituicoes = useRequisicao('/instituicoes')
  const [form, setForm] = useState({ nome: '', email: '', senha: '', curso_id: '', instituicao: '', aceite_termos: false })
  const [erros, setErros] = useState({})
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  function validar() {
    const e = {}
    if (form.nome.trim().length < 3) e.nome = 'Informe seu nome completo.'
    if (!REGEX_EMAIL.test(form.email.trim())) e.email = 'Informe um e-mail válido.'
    const erroSenha = validarSenha(form.senha)
    if (erroSenha) e.senha = erroSenha
    if (!form.curso_id) e.curso_id = 'Selecione seu curso.'
    if (form.instituicao.trim().length < 2) e.instituicao = 'Informe sua instituição de ensino.'
    if (!form.aceite_termos) e.aceite_termos = 'É necessário aceitar os termos para criar a conta.'
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
      const r = await cadastrar({ ...form, nome: form.nome.trim(), email: form.email.trim(), curso_id: Number(form.curso_id) })
      toast.sucesso(r.mensagem)
      navegar('/', { replace: true })
    } catch (erro) {
      setErros(erro.erros || {})
      setMensagem(erro.message)
      setEnviando(false)
    }
  }

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  return (
    <CartaoAuth titulo="Criar Conta" subtitulo="ENAHub">
      <Alerta>{mensagem}</Alerta>
      <Alerta aoTentarNovamente={cursos.recarregar}>{cursos.erro && 'Não foi possível carregar a lista de cursos.'}</Alerta>
      <form onSubmit={enviar} noValidate>
        <Campo rotulo="Nome completo" autoComplete="name" placeholder="Digite seu nome completo"
          value={form.nome} onChange={alterar('nome')} erro={erros.nome} maxLength={100} />
        <Campo rotulo="E-mail" type="email" autoComplete="email" placeholder="seu.email@instituicao.edu.br"
          value={form.email} onChange={alterar('email')} erro={erros.email} maxLength={150} />
        <Campo rotulo="Senha" type="password" autoComplete="new-password" placeholder="Crie uma senha de acesso"
          value={form.senha} onChange={alterar('senha')} erro={erros.senha} ajuda="Mínimo de 8 caracteres, com letras e números." />
        <Campo rotulo="Curso" como="select" value={form.curso_id} onChange={alterar('curso_id')} erro={erros.curso_id}
          disabled={cursos.carregando}>
          <option value="">{cursos.carregando ? 'Carregando cursos...' : 'Selecione seu curso de graduação'}</option>
          {cursos.dados?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Campo>
        <Campo rotulo="Instituição" placeholder="Nome da sua instituição de ensino" list="lista-instituicoes"
          value={form.instituicao} onChange={alterar('instituicao')} erro={erros.instituicao} maxLength={150} />
        <datalist id="lista-instituicoes">
          {instituicoes.dados?.map((i) => <option key={i.id} value={i.nome} />)}
        </datalist>
        <div className="form-check mb-3">
          <input id="aceite" type="checkbox" className={`form-check-input ${erros.aceite_termos ? 'is-invalid' : ''}`}
            checked={form.aceite_termos} onChange={(e) => setForm({ ...form, aceite_termos: e.target.checked })} />
          <label htmlFor="aceite" className="form-check-label small">
            Li e aceito os <Link to="/termos" target="_blank">termos de uso e a política de privacidade</Link>.
          </label>
          {erros.aceite_termos && <div className="invalid-feedback">{erros.aceite_termos}</div>}
        </div>
        <button type="submit" className="btn btn-dark w-100 py-2" disabled={enviando}>
          {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Cadastrar
        </button>
      </form>
      <div className="text-center mt-4 small">
        <Link to="/login">Voltar ao login</Link>
      </div>
    </CartaoAuth>
  )
}
