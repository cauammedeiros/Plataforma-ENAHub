import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, query } from '../api/cliente'
import Alerta from '../components/Alerta'
import CabecalhoPagina from '../components/CabecalhoPagina'
import Campo from '../components/Campo'
import Carregando from '../components/Carregando'
import EstadoVazio from '../components/EstadoVazio'
import InfoQuestao from '../components/InfoQuestao'
import Paginacao from '../components/Paginacao'
import { useAuth, useToast } from '../contexts/contextos'
import { useRequisicao } from '../hooks/useRequisicao'
import { dataHora, numero, PERFIS, plural, resumoTexto, STATUS_QUESTAO } from '../utils/formatar'

// --- Questões (RF006, RF031) -------------------------------------------------
function AbaQuestoes() {
  const { usuario } = useAuth()
  const toast = useToast()
  const ehAdmin = usuario.perfil === 'admin'
  const [status, setStatus] = useState(ehAdmin ? 'pendente' : '')
  const [pagina, setPagina] = useState(1)
  const { dados, carregando, erro, recarregar } = useRequisicao(`/questoes${query({ status, pagina, limite: 15, minhas: ehAdmin ? '' : 'true' })}`)

  async function decidir(id, novo) {
    try {
      const r = await api.patch(`/questoes/${id}/status`, { status: novo })
      toast.sucesso(r.mensagem)
      recarregar()
    } catch (e) {
      toast.erro(e.message)
    }
  }

  const lista = dados?.questoes

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
        <select className="form-select w-auto" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPagina(1) }}>
          <option value="">{ehAdmin ? 'Todas (exceto arquivadas)' : 'Todas as minhas'}</option>
          {Object.entries(STATUS_QUESTAO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <Link to="/admin/questoes/nova" className="btn btn-dark">+ Nova questão</Link>
      </div>
      <Alerta aoTentarNovamente={recarregar}>{erro?.message}</Alerta>
      {carregando && <Carregando />}
      {lista?.length === 0 && <EstadoVazio titulo="Nenhuma questão encontrada">Altere o filtro ou cadastre uma nova questão.</EstadoVazio>}
      {lista?.length > 0 && (
        <div className="list-group">
          {lista.map((q) => (
            <div key={q.id} className="list-group-item py-3">
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <InfoQuestao questao={q} />
                <span className={`badge status-${q.status}`}>{STATUS_QUESTAO[q.status]}</span>
              </div>
              <p className="small text-secondary my-2 texto-quebra">{resumoTexto(q.enunciado, 180)}</p>
              <div className="d-flex flex-wrap gap-2">
                <Link to={`/questoes/${q.id}`} className="btn btn-sm btn-outline-dark">Revisar</Link>
                {ehAdmin && q.status === 'pendente' && (
                  <>
                    <button type="button" className="btn btn-sm btn-success" onClick={() => decidir(q.id, 'aprovada')}>Aprovar</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => decidir(q.id, 'rejeitada')}>Rejeitar</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {dados && <Paginacao pagina={dados.pagina} totalPaginas={dados.total_paginas} aoMudar={setPagina} />}
    </>
  )
}

// --- Usuários (RF030) --------------------------------------------------------
function AbaUsuarios() {
  const { usuario } = useAuth()
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('')
  const { dados, carregando, erro, recarregar, atualizarDados } = useRequisicao(`/admin/usuarios${query({ busca: filtro })}`)

  async function atualizar(id, mudanca) {
    try {
      const r = await api.patch(`/admin/usuarios/${id}`, mudanca)
      toast.sucesso(r.mensagem)
      atualizarDados((lista) => lista.map((u) => (u.id === id ? { ...u, ...mudanca } : u)))
    } catch (e) {
      toast.erro(e.message)
    }
  }

  return (
    <>
      <form className="input-group mb-3" role="search" onSubmit={(e) => { e.preventDefault(); setFiltro(busca.trim()) }}>
        <input type="search" className="form-control" placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuários"
          value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button type="submit" className="btn btn-dark">Buscar</button>
      </form>
      <Alerta aoTentarNovamente={recarregar}>{erro?.message}</Alerta>
      {carregando && <Carregando />}
      {dados && (
        <div className="table-responsive">
          <table className="table align-middle small">
            <thead><tr><th>Usuário</th><th>Curso / instituição</th><th>Perfil</th><th>Último acesso</th><th className="text-end">Situação</th></tr></thead>
            <tbody>
              {dados.map((u) => (
                <tr key={u.id}>
                  <td><div className="fw-semibold">{u.nome}</div><div className="text-secondary">{u.email}</div></td>
                  <td>{u.curso || '—'}<div className="text-secondary">{u.instituicao || ''}</div></td>
                  <td>
                    <select className="form-select form-select-sm" aria-label={`Perfil de ${u.nome}`} value={u.perfil}
                      disabled={u.id === usuario.id} onChange={(e) => atualizar(u.id, { perfil: e.target.value })}>
                      {Object.entries(PERFIS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                    </select>
                  </td>
                  <td className="text-nowrap">{dataHora(u.ultimo_acesso)}</td>
                  <td className="text-end">
                    <button type="button" disabled={u.id === usuario.id}
                      className={`btn btn-sm ${u.bloqueado ? 'btn-outline-success' : 'btn-outline-danger'}`}
                      onClick={() => atualizar(u.id, { bloqueado: !u.bloqueado })}>
                      {u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// --- Denúncias (RF029) -------------------------------------------------------
function AbaDenuncias() {
  const toast = useToast()
  const [status, setStatus] = useState('pendente')
  const { dados, carregando, erro, recarregar } = useRequisicao(`/admin/denuncias?status=${status}`)

  async function analisar(id, decisao) {
    try {
      const r = await api.patch(`/admin/denuncias/${id}`, { status: decisao })
      toast.sucesso(r.mensagem)
      recarregar()
    } catch (e) {
      toast.erro(e.message)
    }
  }

  return (
    <>
      <select className="form-select w-auto mb-3" aria-label="Situação" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="pendente">Pendentes</option>
        <option value="procedente">Procedentes</option>
        <option value="improcedente">Improcedentes</option>
      </select>
      <Alerta aoTentarNovamente={recarregar}>{erro?.message}</Alerta>
      {carregando && <Carregando />}
      {dados?.length === 0 && <EstadoVazio titulo="Nenhuma denúncia nesta situação" />}
      <div className="d-flex flex-column gap-2">
        {dados?.map((d) => (
          <div key={d.id} className="card"><div className="card-body">
            <div className="small text-secondary mb-1">
              {d.tipo === 'topico' ? 'Tópico' : d.tipo === 'resposta' ? 'Resposta do fórum' : 'Comentário de questão'} ·
              denunciado por {d.denunciante} · {dataHora(d.criado_em)}
            </div>
            <blockquote className="border-start ps-3 mb-2 texto-quebra">{d.conteudo || <em>Conteúdo removido</em>}</blockquote>
            <div className="small mb-2"><strong>Motivo:</strong> {d.motivo}</div>
            <div className="d-flex flex-wrap gap-2">
              {d.topico_referencia && <Link className="btn btn-sm btn-outline-dark" to={`/forum/${d.topico_referencia}`}>Abrir tópico</Link>}
              {d.status === 'pendente' && (
                <>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => analisar(d.id, 'procedente')}>Procedente (remover conteúdo)</button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => analisar(d.id, 'improcedente')}>Improcedente</button>
                </>
              )}
            </div>
          </div></div>
        ))}
      </div>
    </>
  )
}

// --- Simulados oficiais (RF032) ----------------------------------------------
function AbaSimuladosOficiais() {
  const toast = useToast()
  const modelos = useRequisicao('/admin/simulados-oficiais')
  const cursos = useRequisicao('/cursos')
  const [form, setForm] = useState({ nome: '', descricao: '', curso_id: '', tempo_minutos: 60 })
  const [selecionadas, setSelecionadas] = useState([])
  const [erros, setErros] = useState({})
  const questoes = useRequisicao(`/questoes${query({ curso_id: form.curso_id, limite: 50 })}`)

  const alternarQuestao = (id) =>
    setSelecionadas((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  async function criar(e) {
    e.preventDefault()
    try {
      const r = await api.post('/admin/simulados-oficiais', {
        ...form, curso_id: form.curso_id ? Number(form.curso_id) : null, tempo_minutos: Number(form.tempo_minutos), questao_ids: selecionadas,
      })
      toast.sucesso(r.mensagem)
      setForm({ nome: '', descricao: '', curso_id: '', tempo_minutos: 60 })
      setSelecionadas([])
      setErros({})
      modelos.recarregar()
    } catch (er) {
      setErros(er.erros || {})
      toast.erro(er.message)
    }
  }

  async function alternarAtivo(m) {
    try {
      const r = await api.patch(`/admin/simulados-oficiais/${m.id}`, { ativo: !m.ativo })
      toast.sucesso(r.mensagem)
      modelos.recarregar()
    } catch (er) {
      toast.erro(er.message)
    }
  }

  return (
    <div className="row g-4">
      <div className="col-lg-5">
        <h2 className="h6 fw-bold">Simulados cadastrados</h2>
        {modelos.carregando && <Carregando />}
        {modelos.dados?.length === 0 && <p className="small text-secondary">Nenhum simulado oficial.</p>}
        <div className="d-flex flex-column gap-2">
          {modelos.dados?.map((m) => (
            <div key={m.id} className="border rounded p-3 bg-white">
              <div className="d-flex justify-content-between gap-2">
                <span className="fw-semibold">{m.nome}</span>
                <span className={`badge ${m.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>{m.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div className="small text-secondary">{m.quantidade_questoes} questões · {m.tempo_minutos} min{m.curso ? ` · ${m.curso}` : ''}</div>
              <button type="button" className="btn btn-link btn-sm p-0 mt-1" onClick={() => alternarAtivo(m)}>{m.ativo ? 'Desativar' : 'Ativar'}</button>
            </div>
          ))}
        </div>
      </div>
      <div className="col-lg-7">
        <form className="card" onSubmit={criar} noValidate>
          <div className="card-body">
            <h2 className="h6 fw-bold">Novo simulado oficial</h2>
            <Campo rotulo="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} erro={erros.nome} maxLength={100} />
            <Campo rotulo="Descrição (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} maxLength={255} />
            <div className="row">
              <Campo className="col-7" rotulo="Curso" como="select" value={form.curso_id}
                onChange={(e) => { setForm({ ...form, curso_id: e.target.value }); setSelecionadas([]) }}>
                <option value="">Todos os cursos</option>
                {cursos.dados?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Campo>
              <Campo className="col-5" rotulo="Tempo (min)" type="number" min={5} max={300} value={form.tempo_minutos}
                onChange={(e) => setForm({ ...form, tempo_minutos: e.target.value })} erro={erros.tempo_minutos} />
            </div>
            <div className="form-label">Questões ({selecionadas.length} selecionadas)</div>
            {erros.questao_ids && <div className="text-danger small mb-2">{erros.questao_ids}</div>}
            <div className="lista-selecao border rounded mb-3">
              {questoes.carregando && <Carregando />}
              {questoes.dados?.questoes.map((q) => (
                <label key={q.id} className="d-flex gap-2 p-2 border-bottom small">
                  <input type="checkbox" className="form-check-input mt-1" checked={selecionadas.includes(q.id)} onChange={() => alternarQuestao(q.id)} />
                  <span><strong>#{q.id}</strong> {resumoTexto(q.enunciado, 110)}</span>
                </label>
              ))}
            </div>
            <button type="submit" className="btn btn-dark">Criar simulado oficial</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- Relatórios (RF033) ------------------------------------------------------
function AbaRelatorios() {
  const { dados: r, carregando, erro, recarregar } = useRequisicao('/admin/relatorios')
  if (carregando) return <Carregando />
  if (erro) return <Alerta aoTentarNovamente={recarregar}>{erro.message}</Alerta>
  if (!r) return null

  const cartoes = [
    ['Usuários', r.usuarios.total, `${plural(r.usuarios.alunos, 'aluno', 'alunos')} · ${plural(r.usuarios.professores, 'professor', 'professores')} · ${plural(r.usuarios.novos_30_dias, 'novo', 'novos')} em 30 dias`],
    ['Questões publicadas', r.questoes.aprovadas, `${plural(r.questoes.pendentes, 'pendente', 'pendentes')} de aprovação`],
    ['Simulados finalizados', r.simulados.finalizados, `${r.simulados.em_andamento} em andamento · ${r.simulados.encerrados_por_tempo} por tempo esgotado`],
    ['Desempenho médio', r.simulados.media_percentual === null ? '—' : `${numero(r.simulados.media_percentual)}%`, `nota média ${numero(r.simulados.media_nota, 2)}`],
  ]
  const totalAcessos = r.acessos_14_dias.reduce((s, d) => s + d.acessos, 0)

  return (
    <>
      <div className="row g-3 mb-4">
        {cartoes.map(([rotulo, valor, detalhe]) => (
          <div key={rotulo} className="col-6 col-lg-3">
            <div className="card h-100"><div className="card-body">
              <div className="rotulo-stat">{rotulo}</div>
              <div className="valor-stat">{valor}</div>
              <div className="small text-secondary">{detalhe}</div>
            </div></div>
          </div>
        ))}
      </div>
      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card h-100"><div className="card-body">
            <h2 className="h6 fw-bold">Acessos nos últimos 14 dias ({plural(totalAcessos, 'login', 'logins')})</h2>
            {r.acessos_14_dias.length === 0 ? <p className="small text-secondary mb-0">Sem acessos no período.</p> : (
              <table className="table table-sm small mb-0">
                <thead><tr><th>Dia</th><th className="text-end">Logins</th><th className="text-end">Usuários distintos</th></tr></thead>
                <tbody>
                  {r.acessos_14_dias.map((d) => (
                    <tr key={d.dia}><td>{d.dia.split('-').reverse().join('/')}</td><td className="text-end">{d.acessos}</td><td className="text-end">{d.usuarios}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div></div>
        </div>
        <div className="col-lg-6">
          <div className="card h-100"><div className="card-body">
            <h2 className="h6 fw-bold">Desempenho médio por curso</h2>
            {r.desempenho_por_curso.length === 0 ? <p className="small text-secondary mb-0">Sem simulados finalizados.</p> : (
              <table className="table table-sm small mb-0">
                <thead><tr><th>Curso</th><th className="text-end">Simulados</th><th className="text-end">Média</th></tr></thead>
                <tbody>
                  {r.desempenho_por_curso.map((c) => (
                    <tr key={c.curso}><td>{c.curso}</td><td className="text-end">{c.simulados}</td><td className="text-end">{numero(c.media_percentual)}%</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="small text-secondary mt-3">
              Fórum: {r.forum.topicos} tópicos · {r.forum.respostas} respostas · {r.forum.denuncias_pendentes} denúncias pendentes
            </div>
          </div></div>
        </div>
      </div>
    </>
  )
}

const ABAS = {
  questoes: { rotulo: 'Questões', componente: AbaQuestoes, perfis: ['admin', 'professor'] },
  usuarios: { rotulo: 'Usuários', componente: AbaUsuarios, perfis: ['admin'] },
  denuncias: { rotulo: 'Denúncias', componente: AbaDenuncias, perfis: ['admin'] },
  simulados: { rotulo: 'Simulados oficiais', componente: AbaSimuladosOficiais, perfis: ['admin'] },
  relatorios: { rotulo: 'Relatórios', componente: AbaRelatorios, perfis: ['admin'] },
}

// Painel administrativo (RF030–RF033). Professores veem apenas a gestão das próprias questões.
export default function Admin() {
  const { usuario } = useAuth()
  const [params, setParams] = useSearchParams()
  const disponiveis = Object.entries(ABAS).filter(([, a]) => a.perfis.includes(usuario.perfil))
  const atual = disponiveis.find(([chave]) => chave === params.get('aba')) || disponiveis[0]
  const Componente = atual[1].componente

  return (
    <>
      <CabecalhoPagina
        titulo={usuario.perfil === 'admin' ? 'Administração' : 'Gestão de questões'}
        subtitulo={usuario.perfil === 'admin' ? 'Gerencie conteúdos, usuários, moderação e relatórios.' : 'Cadastre e acompanhe a aprovação das suas questões.'}
      />
      {disponiveis.length > 1 && (
        <ul className="nav nav-tabs mb-4 flex-nowrap overflow-auto">
          {disponiveis.map(([chave, a]) => (
            <li className="nav-item" key={chave}>
              <button type="button" className={`nav-link text-nowrap ${chave === atual[0] ? 'active' : ''}`}
                aria-current={chave === atual[0] ? 'page' : undefined} onClick={() => setParams({ aba: chave })}>
                {a.rotulo}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Componente />
    </>
  )
}
