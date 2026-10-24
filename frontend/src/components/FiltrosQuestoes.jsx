import { useRequisicao } from '../hooks/useRequisicao'
import { DIFICULDADES } from '../utils/formatar'

// Selects de curso, ano, tema e dificuldade (RF011). `valores` usa os nomes da API.
export default function FiltrosQuestoes({ valores, aoMudar, mostrarAno = true }) {
  const cursos = useRequisicao('/cursos')
  const anos = useRequisicao('/anos')
  const temas = useRequisicao(`/temas${valores.curso_id ? `?curso_id=${valores.curso_id}` : ''}`)

  const mudar = (campo) => (e) => {
    const novo = { ...valores, [campo]: e.target.value }
    if (campo === 'curso_id') novo.tema_id = ''
    aoMudar(novo)
  }

  return (
    <div className="row g-2">
      <div className="col-6 col-lg">
        <select className="form-select" aria-label="Curso" value={valores.curso_id || ''} onChange={mudar('curso_id')}>
          <option value="">Curso: Todos</option>
          {cursos.dados?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      {mostrarAno && (
        <div className="col-6 col-lg">
          <select className="form-select" aria-label="Ano" value={valores.ano || ''} onChange={mudar('ano')}>
            <option value="">Ano: Todos</option>
            {anos.dados?.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}
      <div className="col-6 col-lg">
        <select className="form-select" aria-label="Tema" value={valores.tema_id || ''} onChange={mudar('tema_id')}>
          <option value="">Tema: Todos</option>
          {temas.dados?.map((t) => (
            <option key={t.id} value={t.id}>{valores.curso_id || !t.curso ? t.nome : `${t.nome} (${t.curso})`}</option>
          ))}
        </select>
      </div>
      <div className="col-6 col-lg">
        <select className="form-select" aria-label="Dificuldade" value={valores.dificuldade || ''} onChange={mudar('dificuldade')}>
          <option value="">Dificuldade: Todas</option>
          {Object.entries(DIFICULDADES).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
        </select>
      </div>
    </div>
  )
}
