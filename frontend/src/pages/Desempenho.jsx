import { useState } from 'react'
import { Link } from 'react-router-dom'
import { query } from '../api/cliente'
import Alerta from '../components/Alerta'
import BarraPercentual from '../components/BarraPercentual'
import CabecalhoPagina from '../components/CabecalhoPagina'
import Carregando from '../components/Carregando'
import EstadoVazio from '../components/EstadoVazio'
import GraficoEvolucao from '../components/GraficoEvolucao'
import { useAuth } from '../contexts/contextos'
import { useRequisicao } from '../hooks/useRequisicao'
import { dataHora, numero } from '../utils/formatar'

function Stat({ rotulo, valor }) {
  return (
    <div className="col-6 col-md-3">
      <div className="card h-100"><div className="card-body">
        <div className="rotulo-stat">{rotulo}</div>
        <div className="valor-stat">{valor}</div>
      </div></div>
    </div>
  )
}

function Ranking() {
  const { usuario } = useAuth()
  const [doMeuCurso, setDoMeuCurso] = useState(false)
  const { dados, carregando, erro, recarregar } = useRequisicao(
    `/desempenho/ranking${query({ curso_id: doMeuCurso ? usuario.curso_id : '' })}`,
  )

  return (
    <div className="card h-100">
      <div className="card-body p-3 p-md-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h6 fw-bold mb-0">Ranking geral</h2>
          {usuario.curso_id && (
            <div className="form-check form-switch small mb-0">
              <input id="ranking-curso" className="form-check-input" type="checkbox" checked={doMeuCurso} onChange={(e) => setDoMeuCurso(e.target.checked)} />
              <label className="form-check-label" htmlFor="ranking-curso">Somente meu curso</label>
            </div>
          )}
        </div>
        <Alerta aoTentarNovamente={recarregar}>{erro?.message}</Alerta>
        {carregando && <Carregando />}
        {dados && dados.ranking.length === 0 && <p className="small text-secondary">Ainda não há simulados finalizados para o ranking.</p>}
        {dados && dados.ranking.length > 0 && (
          <>
            <div className="table-responsive">
              <table className="table table-sm align-middle small mb-2">
                <thead><tr><th>#</th><th>Estudante</th><th className="text-end">Simulados</th><th className="text-end">Média</th></tr></thead>
                <tbody>
                  {dados.ranking.map((l) => (
                    <tr key={l.usuario_id} className={l.eu ? 'table-active fw-semibold' : ''}>
                      <td>{l.posicao}º</td>
                      <td>{l.nome}{l.eu && ' (você)'}<div className="text-secondary fw-normal text-truncate ranking-curso" title={l.curso}>{l.curso}</div></td>
                      <td className="text-end">{l.simulados}</td>
                      <td className="text-end">{numero(l.media_percentual)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small text-secondary mb-0">
              {dados.minha_posicao
                ? `Sua posição: ${dados.minha_posicao.posicao}º de ${dados.participantes}.`
                : 'Conclua um simulado para entrar no ranking.'}{' '}
              Classificação pela média de aproveitamento.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// Histórico e estatísticas (RF020–RF022)
export default function Desempenho() {
  const resumo = useRequisicao('/desempenho/resumo')
  const historico = useRequisicao('/simulados')
  const r = resumo.dados

  return (
    <>
      <CabecalhoPagina titulo="Meu Desempenho" subtitulo="Acompanhe sua evolução, médias e desempenho por tema.">
        <Link to="/simulados" className="btn btn-dark">Novo simulado</Link>
      </CabecalhoPagina>

      <Alerta aoTentarNovamente={resumo.recarregar}>{resumo.erro?.message}</Alerta>
      {resumo.carregando && <Carregando />}

      {r && (
        <>
          <div className="row g-3 mb-4">
            <Stat rotulo="Simulados concluídos" valor={r.total_simulados} />
            <Stat rotulo="Média de aproveitamento" valor={r.media_percentual === null ? '—' : `${numero(r.media_percentual)}%`} />
            <Stat rotulo="Nota média" valor={r.media_nota === null ? '—' : numero(r.media_nota, 2)} />
            <Stat rotulo="Melhor resultado" valor={r.melhor_percentual === null ? '—' : `${numero(r.melhor_percentual)}%`} />
          </div>

          {r.total_simulados === 0 ? (
            <div className="card mb-4">
              <EstadoVazio titulo="Você ainda não concluiu nenhum simulado"
                acao={<Link to="/simulados" className="btn btn-dark btn-sm">Fazer meu primeiro simulado</Link>}>
                Suas estatísticas aparecerão aqui depois do primeiro simulado.
              </EstadoVazio>
            </div>
          ) : (
            <div className="row g-4 mb-4">
              <div className="col-lg-7">
                <div className="card h-100"><div className="card-body p-3 p-md-4">
                  <h2 className="h6 fw-bold mb-1">Evolução do aproveitamento</h2>
                  <p className="small text-secondary mb-2">Últimos {r.evolucao.length} simulados concluídos</p>
                  <GraficoEvolucao pontos={r.evolucao} />
                </div></div>
              </div>
              <div className="col-lg-5">
                <div className="card h-100"><div className="card-body p-3 p-md-4">
                  <h2 className="h6 fw-bold mb-3">Desempenho por tema</h2>
                  {r.por_tema.map((t) => (
                    <BarraPercentual key={t.tema} rotulo={t.tema} percentual={t.percentual} detalhe={`${t.acertos} de ${t.total} corretas`} />
                  ))}
                </div></div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card h-100"><div className="card-body p-3 p-md-4">
            <h2 className="h6 fw-bold mb-3">Histórico de simulados</h2>
            <Alerta aoTentarNovamente={historico.recarregar}>{historico.erro?.message}</Alerta>
            {historico.carregando && <Carregando />}
            {historico.dados?.length === 0 && <p className="small text-secondary mb-0">Nenhum simulado realizado.</p>}
            {historico.dados?.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm align-middle small mb-0">
                  <thead><tr><th>Simulado</th><th>Data</th><th className="text-end">Acertos</th><th className="text-end">Nota</th><th /></tr></thead>
                  <tbody>
                    {historico.dados.map((s) => (
                      <tr key={s.id}>
                        <td>{s.nome}{s.finalizado_por === 'tempo' && <span className="badge text-bg-light border ms-1">tempo esgotado</span>}</td>
                        <td className="text-nowrap">{dataHora(s.data_inicio)}</td>
                        <td className="text-end">{s.status === 'finalizado' ? `${s.acertos}/${s.quantidade_questoes}` : '—'}</td>
                        <td className="text-end">{s.status === 'finalizado' ? numero(s.nota, 2) : '—'}</td>
                        <td className="text-end">
                          {s.status === 'finalizado'
                            ? <Link to={`/simulados/${s.id}/resultado`}>Ver</Link>
                            : <Link to={`/simulados/${s.id}`} className="fw-semibold">Continuar</Link>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div></div>
        </div>
        <div className="col-lg-5">
          <Ranking />
        </div>
      </div>
    </>
  )
}
