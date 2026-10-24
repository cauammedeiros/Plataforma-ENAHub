import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { query } from '../api/cliente'
import Alerta from '../components/Alerta'
import BotaoFavorito from '../components/BotaoFavorito'
import CabecalhoPagina from '../components/CabecalhoPagina'
import Carregando from '../components/Carregando'
import EstadoVazio from '../components/EstadoVazio'
import FiltrosQuestoes from '../components/FiltrosQuestoes'
import InfoQuestao from '../components/InfoQuestao'
import Paginacao from '../components/Paginacao'
import { useRequisicao } from '../hooks/useRequisicao'
import { resumoTexto } from '../utils/formatar'

const CAMPOS = ['busca', 'curso_id', 'ano', 'tema_id', 'dificuldade', 'pagina']

export default function BancoQuestoes() {
  // Os filtros ficam na URL: dá para compartilhar o link e voltar com o botão do navegador
  const [params, setParams] = useSearchParams()
  const filtros = Object.fromEntries(CAMPOS.map((c) => [c, params.get(c) || '']))
  const [busca, setBusca] = useState(filtros.busca)

  const caminho = `/questoes${query({ ...filtros, limite: 10 })}`
  const { dados, carregando, erro, recarregar, atualizarDados } = useRequisicao(caminho)

  function aplicar(novos) {
    const proximo = { ...filtros, ...novos }
    if (!('pagina' in novos)) proximo.pagina = ''
    setParams(Object.fromEntries(Object.entries(proximo).filter(([, v]) => v)))
  }

  const marcarFavorita = (id, favorita) =>
    atualizarDados((d) => ({ ...d, questoes: d.questoes.map((q) => (q.id === id ? { ...q, favorita } : q)) }))

  const temFiltro = CAMPOS.some((c) => c !== 'pagina' && filtros[c])

  return (
    <>
      <CabecalhoPagina titulo="Banco de Questões" subtitulo="Pesquise e pratique questões por curso, ano, tema e dificuldade." />

      <form className="input-group mb-3" role="search" onSubmit={(e) => { e.preventDefault(); aplicar({ busca: busca.trim() }) }}>
        <input type="search" className="form-control" placeholder="Pesquisar questão por palavra-chave ou termo técnico..."
          aria-label="Pesquisar questões" value={busca} onChange={(e) => setBusca(e.target.value)} maxLength={100} />
        <button type="submit" className="btn btn-dark">Buscar</button>
      </form>
      <div className="mb-4">
        <FiltrosQuestoes valores={filtros} aoMudar={aplicar} />
      </div>

      <Alerta aoTentarNovamente={recarregar}>{erro?.message}</Alerta>
      {carregando && <Carregando texto="Buscando questões..." />}

      {dados && (
        <>
          <p className="small text-secondary mb-2">
            {dados.total} {dados.total === 1 ? 'questão encontrada' : 'questões encontradas'}
          </p>
          {dados.questoes.length === 0 ? (
            <div className="card">
              <EstadoVazio
                titulo="Nenhuma questão encontrada"
                acao={temFiltro && (
                  <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => { setBusca(''); setParams({}) }}>
                    Limpar filtros
                  </button>
                )}
              >
                Tente outros termos ou remova alguns filtros.
              </EstadoVazio>
            </div>
          ) : (
            <div className="list-group lista-questoes">
              {dados.questoes.map((q, i) => (
                <div key={q.id} className="list-group-item d-flex align-items-center gap-3 py-3">
                  <div className="flex-grow-1 min-w-0">
                    <InfoQuestao questao={q} numero={(dados.pagina - 1) * dados.limite + i + 1} />
                    <p className="mb-0 mt-1 text-secondary small texto-quebra">{resumoTexto(q.enunciado, 150)}</p>
                  </div>
                  <BotaoFavorito questaoId={q.id} favorita={q.favorita} aoAlterar={(f) => marcarFavorita(q.id, f)} />
                  <Link to={`/questoes/${q.id}`} className="btn btn-outline-dark btn-sm">Visualizar</Link>
                </div>
              ))}
            </div>
          )}
          <Paginacao pagina={dados.pagina} totalPaginas={dados.total_paginas} aoMudar={(p) => aplicar({ pagina: String(p) })} />
        </>
      )}
    </>
  )
}
