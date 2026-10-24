import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, query } from '../api/cliente'
import Alerta from '../components/Alerta'
import BotaoCurtir from '../components/BotaoCurtir'
import BotaoDenunciar from '../components/BotaoDenunciar'
import CabecalhoPagina from '../components/CabecalhoPagina'
import Campo from '../components/Campo'
import Carregando from '../components/Carregando'
import EstadoVazio from '../components/EstadoVazio'
import Modal from '../components/Modal'
import Paginacao from '../components/Paginacao'
import { useToast } from '../contexts/contextos'
import { useRequisicao } from '../hooks/useRequisicao'
import { tempoRelativo } from '../utils/formatar'

function NovoTopico({ aberto, aoFechar }) {
  const toast = useToast()
  const navegar = useNavigate()
  const [form, setForm] = useState({ titulo: '', conteudo: '' })
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    const novos = {}
    if (form.titulo.trim().length < 5) novos.titulo = 'O título deve ter pelo menos 5 caracteres.'
    if (form.conteudo.trim().length < 10) novos.conteudo = 'Escreva pelo menos 10 caracteres.'
    setErros(novos)
    if (Object.keys(novos).length) return
    setEnviando(true)
    try {
      const r = await api.post('/forum/topicos', form)
      toast.sucesso(r.mensagem)
      navegar(`/forum/${r.id}`)
    } catch (e) {
      setErros(e.erros || {})
      toast.erro(e.message)
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo="Criar tópico"
      aberto={aberto}
      aoFechar={aoFechar}
      rodape={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="btn btn-dark" disabled={enviando} onClick={enviar}>Publicar</button>
        </>
      )}
    >
      <Campo rotulo="Título" maxLength={200} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} erro={erros.titulo} />
      <Campo rotulo="Conteúdo" como="textarea" rows={5} maxLength={10000} value={form.conteudo}
        onChange={(e) => setForm({ ...form, conteudo: e.target.value })} erro={erros.conteudo} />
    </Modal>
  )
}

// Fórum de discussão (wireframe 10.7, RF026–RF029)
export default function Forum() {
  const [params, setParams] = useSearchParams()
  const pagina = Number(params.get('pagina')) || 1
  const buscaAtual = params.get('busca') || ''
  const [busca, setBusca] = useState(buscaAtual)
  const [criando, setCriando] = useState(false)
  const { dados, carregando, erro, recarregar, atualizarDados } = useRequisicao(`/forum/topicos${query({ busca: buscaAtual, pagina })}`)

  const atualizarCurtida = (id, r) =>
    atualizarDados((d) => ({ ...d, topicos: d.topicos.map((t) => (t.id === id ? { ...t, ...r } : t)) }))

  return (
    <>
      <CabecalhoPagina titulo="Fórum de Discussão" subtitulo="Tire dúvidas e compartilhe estratégias de estudo." />
      <div className="d-flex gap-2 mb-4">
        <form className="flex-grow-1" role="search" onSubmit={(e) => { e.preventDefault(); setParams(busca.trim() ? { busca: busca.trim() } : {}) }}>
          <input type="search" className="form-control" placeholder="Pesquisar no fórum..." aria-label="Pesquisar no fórum"
            value={busca} onChange={(e) => setBusca(e.target.value)} maxLength={100} />
        </form>
        <button type="button" className="btn btn-dark text-nowrap" onClick={() => setCriando(true)}>Criar Tópico</button>
      </div>

      <Alerta aoTentarNovamente={recarregar}>{erro?.message}</Alerta>
      {carregando && <Carregando />}
      {dados?.topicos.length === 0 && (
        <div className="card">
          <EstadoVazio titulo={buscaAtual ? 'Nenhum tópico encontrado' : 'Nenhum tópico ainda'}
            acao={<button type="button" className="btn btn-dark btn-sm" onClick={() => setCriando(true)}>Criar o primeiro tópico</button>}>
            {buscaAtual ? 'Tente outra pesquisa.' : 'Comece uma discussão com outros estudantes.'}
          </EstadoVazio>
        </div>
      )}
      {dados?.topicos.length > 0 && (
        <div className="list-group">
          {dados.topicos.map((t) => (
            <div key={t.id} className="list-group-item py-3">
              <div className="row align-items-center g-2">
                <div className="col-md-7">
                  <Link to={`/forum/${t.id}`} className="fw-semibold text-body text-decoration-none stretched-link-md">{t.titulo}</Link>
                  <div className="small text-secondary">Postado por <strong>{t.autor}</strong> • {tempoRelativo(t.criado_em)}</div>
                </div>
                <div className="col-4 col-md-2 small text-secondary">{t.respostas} {t.respostas === 1 ? 'resposta' : 'respostas'}</div>
                <div className="col-8 col-md-3 d-flex align-items-center justify-content-end gap-3">
                  <BotaoCurtir caminho={`/forum/topicos/${t.id}/curtir`} curtido={t.curtido} curtidas={t.curtidas}
                    aoAlterar={(r) => atualizarCurtida(t.id, r)} />
                  <BotaoDenunciar tipo="topico" id={t.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {dados && <Paginacao pagina={dados.pagina} totalPaginas={dados.total_paginas}
        aoMudar={(p) => setParams({ ...(buscaAtual ? { busca: buscaAtual } : {}), pagina: String(p) })} />}
      <NovoTopico aberto={criando} aoFechar={() => setCriando(false)} />
    </>
  )
}
