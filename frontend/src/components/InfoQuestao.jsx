import { DIFICULDADES } from '../utils/formatar'

// Linha de metadados da questão. Deixa explícito quando ela NÃO é oficial do ENADE.
export default function InfoQuestao({ questao, numero }) {
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 small">
      {numero !== undefined && <span className="fw-semibold">Questão {String(numero).padStart(2, '0')}</span>}
      {questao.oficial_enade ? (
        <span className="badge text-bg-primary">ENADE {questao.ano}</span>
      ) : (
        <span className="badge badge-demo" title={questao.fonte || 'Questão não oficial'}>
          Demonstrativa{questao.ano ? ` · ref. ${questao.ano}` : ''}
        </span>
      )}
      {questao.curso && <span className="text-secondary">{questao.curso}</span>}
      {questao.tema && <span className="text-secondary">· {questao.tema}</span>}
      {questao.dificuldade && (
        <span className={`badge badge-dif badge-dif-${questao.dificuldade}`}>{DIFICULDADES[questao.dificuldade]}</span>
      )}
    </div>
  )
}
