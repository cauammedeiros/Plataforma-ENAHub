import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/cliente'
import CabecalhoPagina from '../components/CabecalhoPagina'
import Campo from '../components/Campo'
import Modal from '../components/Modal'
import { useAuth, useToast } from '../contexts/contextos'
import { useRequisicao } from '../hooks/useRequisicao'
import { data, PERFIS } from '../utils/formatar'
import { validarSenha } from '../utils/validacao'

function DadosPessoais() {
  const { usuario, setUsuario } = useAuth()
  const toast = useToast()
  const cursos = useRequisicao('/cursos')
  const instituicoes = useRequisicao('/instituicoes')
  const [form, setForm] = useState({
    nome: usuario.nome, curso_id: usuario.curso_id ? String(usuario.curso_id) : '', instituicao: usuario.instituicao || '',
  })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const novos = {}
    if (form.nome.trim().length < 3) novos.nome = 'Informe seu nome completo.'
    if (!form.curso_id) novos.curso_id = 'Selecione seu curso.'
    if (form.instituicao.trim().length < 2) novos.instituicao = 'Informe sua instituição.'
    setErros(novos)
    if (Object.keys(novos).length) return

    setSalvando(true)
    try {
      const r = await api.put('/usuarios/me', { nome: form.nome.trim(), curso_id: Number(form.curso_id), instituicao: form.instituicao.trim() })
      setUsuario(r.usuario)
      toast.sucesso(r.mensagem)
    } catch (erro) {
      setErros(erro.erros || {})
      toast.erro(erro.message)
    } finally {
      setSalvando(false)
    }
  }

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })
  return (
    <form onSubmit={salvar} noValidate>
      <Campo rotulo="Nome completo" value={form.nome} onChange={alterar('nome')} erro={erros.nome} maxLength={100} />
      <Campo rotulo="E-mail" value={usuario.email} disabled ajuda="O e-mail é usado para login e não pode ser alterado." />
      <Campo rotulo="Curso" como="select" value={form.curso_id} onChange={alterar('curso_id')} erro={erros.curso_id}>
        <option value="">Selecione</option>
        {cursos.dados?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </Campo>
      <Campo rotulo="Instituição" list="perfil-instituicoes" value={form.instituicao} onChange={alterar('instituicao')} erro={erros.instituicao} maxLength={150} />
      <datalist id="perfil-instituicoes">{instituicoes.dados?.map((i) => <option key={i.id} value={i.nome} />)}</datalist>
      <button type="submit" className="btn btn-dark" disabled={salvando}>Salvar alterações</button>
    </form>
  )
}

function AlterarSenha() {
  const toast = useToast()
  const [form, setForm] = useState({ senha_atual: '', nova_senha: '', confirmacao: '' })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const novos = {}
    if (!form.senha_atual) novos.senha_atual = 'Informe a senha atual.'
    const erroSenha = validarSenha(form.nova_senha)
    if (erroSenha) novos.nova_senha = erroSenha
    if (form.nova_senha !== form.confirmacao) novos.confirmacao = 'As senhas não conferem.'
    setErros(novos)
    if (Object.keys(novos).length) return

    setSalvando(true)
    try {
      await api.put('/usuarios/me', { senha_atual: form.senha_atual, nova_senha: form.nova_senha })
      toast.sucesso('Senha alterada. Outras sessões abertas foram encerradas.')
      setForm({ senha_atual: '', nova_senha: '', confirmacao: '' })
    } catch (erro) {
      setErros(erro.erros || {})
      toast.erro(erro.message)
    } finally {
      setSalvando(false)
    }
  }

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })
  return (
    <form onSubmit={salvar} noValidate>
      <Campo rotulo="Senha atual" type="password" autoComplete="current-password" value={form.senha_atual} onChange={alterar('senha_atual')} erro={erros.senha_atual} />
      <Campo rotulo="Nova senha" type="password" autoComplete="new-password" value={form.nova_senha} onChange={alterar('nova_senha')} erro={erros.nova_senha} />
      <Campo rotulo="Confirme a nova senha" type="password" autoComplete="new-password" value={form.confirmacao} onChange={alterar('confirmacao')} erro={erros.confirmacao} />
      <button type="submit" className="btn btn-outline-dark" disabled={salvando}>Alterar senha</button>
    </form>
  )
}

function ExcluirConta() {
  const { encerrarLocal } = useAuth()
  const toast = useToast()
  const navegar = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erros, setErros] = useState({})
  const [excluindo, setExcluindo] = useState(false)

  async function excluir() {
    setExcluindo(true)
    try {
      const r = await api.delete('/usuarios/me', { senha, confirmacao })
      encerrarLocal()
      toast.sucesso(r.mensagem)
      navegar('/login', { replace: true })
    } catch (erro) {
      setErros(erro.erros || {})
      if (!erro.erros) toast.erro(erro.message)
      setExcluindo(false)
    }
  }

  const fechar = () => { setAberto(false); setSenha(''); setConfirmacao(''); setErros({}) }

  return (
    <>
      <p className="small text-secondary">
        A exclusão é permanente: seus dados pessoais, simulados, favoritos e publicações no fórum serão apagados (LGPD).
      </p>
      <button type="button" className="btn btn-outline-danger" onClick={() => setAberto(true)}>Excluir minha conta</button>
      <Modal
        titulo="Excluir conta"
        aberto={aberto}
        aoFechar={fechar}
        rodape={(
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={fechar}>Cancelar</button>
            <button type="button" className="btn btn-danger" disabled={excluindo || confirmacao !== 'EXCLUIR' || !senha} onClick={excluir}>
              Excluir definitivamente
            </button>
          </>
        )}
      >
        <p>Esta ação não pode ser desfeita. Para confirmar, informe sua senha e digite <strong>EXCLUIR</strong>.</p>
        <Campo rotulo="Senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} erro={erros.senha} />
        <Campo rotulo="Digite EXCLUIR" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} erro={erros.confirmacao} />
      </Modal>
    </>
  )
}

// RF004, RF005
export default function Perfil() {
  const { usuario } = useAuth()
  return (
    <>
      <CabecalhoPagina titulo="Meu Perfil" subtitulo={`${PERFIS[usuario.perfil]} · conta criada em ${data(usuario.criado_em)}`}>
        <Link to="/favoritas" className="btn btn-outline-dark">Questões favoritas</Link>
        <Link to="/desempenho" className="btn btn-outline-dark">Histórico de desempenho</Link>
      </CabecalhoPagina>
      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card"><div className="card-body p-3 p-md-4">
            <h2 className="h6 fw-bold mb-3">Dados pessoais</h2>
            <DadosPessoais />
          </div></div>
        </div>
        <div className="col-lg-6 d-flex flex-column gap-4">
          <div className="card"><div className="card-body p-3 p-md-4">
            <h2 className="h6 fw-bold mb-3">Alterar senha</h2>
            <AlterarSenha />
          </div></div>
          <div className="card border-danger-subtle"><div className="card-body p-3 p-md-4">
            <h2 className="h6 fw-bold mb-2 text-danger">Excluir conta</h2>
            <ExcluirConta />
          </div></div>
        </div>
      </div>
    </>
  )
}
