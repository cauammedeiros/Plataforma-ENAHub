import { Link } from 'react-router-dom'
import Alerta from '../components/Alerta'
import BotaoFavorito from '../components/BotaoFavorito'
import CabecalhoPagina from '../components/CabecalhoPagina'
import Carregando from '../components/Carregando'
import EstadoVazio from '../components/EstadoVazio'
import InfoQuestao from '../components/InfoQuestao'
import { useRequisicao } from '../hooks/useRequisicao'
import { resumoTexto } from '../utils/formatar'

// RF012 — questões salvas para revisar depois
export default function Favoritas() {
  const { dados, carregando, erro, recarregar, atualizarDados } = useRequisicao('/questoes/favoritas')

  return (
    <>
      <CabecalhoPagina titulo="Questões Favoritas" subtitulo="As questões que você salvou para revisar." />
      <Alerta aoTentarNovamente={recarregar}>{erro?.message}</Alerta>
      {carregando && <Carregando />}
      {dados?.length === 0 && (
        <div className="card">
          <EstadoVazio titulo="Nenhuma questão favorita" acao={<Link to="/questoes" className="btn btn-dark btn-sm">Explorar banco de questões</Link>}>
            Use a estrela ☆ no banco de questões para salvar questões aqui.
          </EstadoVazio>
        </div>
      )}
      {dados?.length > 0 && (
        <div className="list-group lista-questoes">
          {dados.map((q) => (
            <div key={q.id} className="list-group-item d-flex align-items-center gap-3 py-3">
              <div className="flex-grow-1 min-w-0">
                <InfoQuestao questao={q} />
                <p className="mb-0 mt-1 text-secondary small texto-quebra">{resumoTexto(q.enunciado, 150)}</p>
              </div>
              <BotaoFavorito questaoId={q.id} favorita
                aoAlterar={(f) => !f && atualizarDados((lista) => lista.filter((x) => x.id !== q.id))} />
              <Link to={`/questoes/${q.id}`} className="btn btn-outline-dark btn-sm">Visualizar</Link>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
