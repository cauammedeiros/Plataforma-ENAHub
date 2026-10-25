import { Link } from 'react-router-dom'
import Alerta from '../components/Alerta'
import Icone from '../components/Icone'
import { useAuth } from '../contexts/contextos'
import { useRequisicao } from '../hooks/useRequisicao'
import { numero } from '../utils/formatar'

const ATALHOS = [
  { para: '/simulados', titulo: 'Iniciar Simulado', texto: 'Teste seus conhecimentos sob as condições reais da prova.', icone: 'cronometro' },
  { para: '/questoes', titulo: 'Banco de Questões', texto: 'Explore e resolva questões de forma personalizada.', icone: 'lista' },
  { para: '/desempenho', titulo: 'Meu Desempenho', texto: 'Acompanhe sua evolução, histórico e desempenho por tema.', icone: 'grafico' },
  { para: '/favoritas', titulo: 'Questões Favoritas', texto: 'Acesse rapidamente as questões que você salvou para revisar.', icone: 'estrela' },
  { para: '/forum', titulo: 'Fórum', texto: 'Discuta resoluções e tire dúvidas com outros estudantes.', icone: 'balao' },
]

// Sequência calculada no servidor a partir das datas reais de simulados e respostas
function textoSequencia(r) {
  if (r.dias_seguidos > 0) return `${r.dias_seguidos} ${r.dias_seguidos === 1 ? 'dia ativo' : 'dias ativos'}`
  return r.total_simulados > 0 || r.questoes_respondidas > 0 ? 'Retome hoje' : 'Sem atividade ainda'
}

export default function Inicio() {
  const { usuario } = useAuth()
  const resumo = useRequisicao('/desempenho/resumo')
  const r = resumo.dados

  return (
    <>
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1">Olá, {usuario.nome.split(' ')[0]}!</h1>
        <p className="text-secondary mb-0">Selecione uma das opções abaixo para continuar sua preparação para o ENADE.</p>
      </div>

      {r?.simulado_em_andamento_id && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span><strong>Você tem um simulado em andamento.</strong> O tempo continua correndo.</span>
          <Link className="btn btn-dark btn-sm" to={`/simulados/${r.simulado_em_andamento_id}`}>Continuar simulado</Link>
        </div>
      )}

      <div className="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-3 mb-4">
        {ATALHOS.map((a) => (
          <div className="col" key={a.para}>
            <Link to={a.para} className="card cartao-atalho h-100 text-center text-decoration-none">
              <div className="card-body d-flex flex-column align-items-center p-3 p-md-4">
                <span className="atalho-icone mb-3"><Icone nome={a.icone} /></span>
                <h2 className="h6 fw-bold text-body mb-2">{a.titulo}</h2>
                <p className="small text-secondary mb-0 d-none d-sm-block">{a.texto}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <Alerta aoTentarNovamente={resumo.recarregar}>{resumo.erro?.message}</Alerta>
      <div className="card">
        <div className="card-body row g-3 text-center text-md-start">
          <div className="col-12 col-md-4">
            <div className="rotulo-stat">Último simulado</div>
            <div className="valor-stat">
              {resumo.carregando || !r ? '…' : r.ultimo_simulado ? `${numero(r.ultimo_simulado.percentual, 0)}% de acertos` : 'Nenhum ainda'}
            </div>
            {r?.ultimo_simulado && (
              <Link to={`/simulados/${r.ultimo_simulado.id}/resultado`} className="small">
                Nota {numero(r.ultimo_simulado.nota, 2)} · ver resultado
              </Link>
            )}
          </div>
          <div className="col-6 col-md-4">
            <div className="rotulo-stat">Questões respondidas</div>
            <div className="valor-stat">{resumo.carregando || !r ? '…' : `${r.questoes_respondidas}/${r.questoes_disponiveis} total`}</div>
            <div className="small text-secondary">questões diferentes, respondidas em simulados</div>
          </div>
          <div className="col-6 col-md-4">
            <div className="rotulo-stat">Dias seguidos de estudo</div>
            <div className="valor-stat">{resumo.carregando || !r ? '…' : textoSequencia(r)}</div>
            <div className="small text-secondary">dias consecutivos com simulados</div>
          </div>
        </div>
      </div>
    </>
  )
}
