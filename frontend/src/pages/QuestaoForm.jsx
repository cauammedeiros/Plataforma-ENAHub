import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/cliente'
import Alerta from '../components/Alerta'
import CabecalhoPagina from '../components/CabecalhoPagina'
import Campo from '../components/Campo'
import Carregando from '../components/Carregando'
import { useAuth, useToast } from '../contexts/contextos'
import { useRequisicao } from '../hooks/useRequisicao'
import { DIFICULDADES } from '../utils/formatar'

const LETRAS = ['A', 'B', 'C', 'D', 'E']
const ANO_ATUAL = new Date().getFullYear()

function vazio() {
  return {
    enunciado: '', ano: '', dificuldade: 'media', curso_id: '', tema_id: '', fonte: '', oficial_enade: false,
    alternativas: LETRAS.map(() => ''), correta: '',
  }
}

function deQuestao(q) {
  return {
    enunciado: q.enunciado, ano: q.ano ? String(q.ano) : '', dificuldade: q.dificuldade, curso_id: String(q.curso_id),
    tema_id: q.tema_id ? String(q.tema_id) : '', fonte: q.fonte || '', oficial_enade: q.oficial_enade,
    alternativas: LETRAS.map((l) => q.alternativas.find((a) => a.letra === l)?.texto || ''),
    correta: q.alternativas.find((a) => a.correta)?.letra || '',
  }
}

function Formulario({ inicial, questaoId }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const navegar = useNavigate()
  const cursos = useRequisicao('/cursos')
  const [form, setForm] = useState(inicial)
  const temas = useRequisicao(form.curso_id ? `/temas?curso_id=${form.curso_id}` : null)
  const [erros, setErros] = useState({})
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)

  function validar() {
    const e = {}
    if (form.enunciado.trim().length < 10) e.enunciado = 'O enunciado deve ter pelo menos 10 caracteres.'
    if (!form.curso_id) e.curso_id = 'Selecione o curso.'
    if (form.ano && (Number(form.ano) < 2010 || Number(form.ano) > ANO_ATUAL)) e.ano = `Use um ano entre 2010 e ${ANO_ATUAL}.`
    if (form.oficial_enade && !form.ano) e.ano = 'Questões oficiais precisam do ano da prova.'
    form.alternativas.forEach((t, i) => { if (!t.trim()) e[`alternativa_${LETRAS[i]}`] = `Preencha a alternativa ${LETRAS[i]}.` })
    if (!form.correta) e.correta = 'Marque a alternativa correta.'
    return e
  }

  async function salvar(evento) {
    evento.preventDefault()
    const e = validar()
    setErros(e)
    setMensagem(Object.keys(e).length ? 'Verifique os campos destacados.' : '')
    if (Object.keys(e).length) return

    const corpo = {
      enunciado: form.enunciado.trim(),
      ano: form.ano ? Number(form.ano) : null,
      dificuldade: form.dificuldade,
      curso_id: Number(form.curso_id),
      tema_id: form.tema_id ? Number(form.tema_id) : null,
      fonte: form.fonte.trim() || null,
      oficial_enade: form.oficial_enade,
      alternativas: form.alternativas.map((texto) => ({ texto: texto.trim() })),
      correta: form.correta,
    }
    setSalvando(true)
    try {
      const r = questaoId ? await api.put(`/questoes/${questaoId}`, corpo) : await api.post('/questoes', corpo)
      toast.sucesso(r.mensagem)
      navegar(`/questoes/${r.questao.id}`)
    } catch (erro) {
      setErros(erro.erros || {})
      setMensagem(erro.message)
      setSalvando(false)
    }
  }

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  return (
    <form onSubmit={salvar} noValidate className="card">
      <div className="card-body p-3 p-md-4">
        <Alerta>{mensagem}</Alerta>
        {usuario.perfil === 'professor' && (
          <div className="alert alert-info small">Questões cadastradas ou editadas por professores ficam pendentes até a aprovação do administrador.</div>
        )}
        <Campo rotulo="Enunciado" como="textarea" rows={5} value={form.enunciado} onChange={alterar('enunciado')} erro={erros.enunciado} />
        <div className="row">
          <Campo className="col-md-6" rotulo="Curso" como="select" value={form.curso_id}
            onChange={(e) => setForm({ ...form, curso_id: e.target.value, tema_id: '' })} erro={erros.curso_id}>
            <option value="">Selecione</option>
            {cursos.dados?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Campo>
          <Campo className="col-md-6" rotulo="Tema / área" como="select" value={form.tema_id} onChange={alterar('tema_id')}
            erro={erros.tema_id} disabled={!form.curso_id}>
            <option value="">Sem tema</option>
            {temas.dados?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </Campo>
          <Campo className="col-6 col-md-4" rotulo="Ano" type="number" min={2010} max={ANO_ATUAL} value={form.ano} onChange={alterar('ano')} erro={erros.ano} />
          <Campo className="col-6 col-md-4" rotulo="Dificuldade" como="select" value={form.dificuldade} onChange={alterar('dificuldade')} erro={erros.dificuldade}>
            {Object.entries(DIFICULDADES).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Campo>
          <div className="col-md-4 mb-3 d-flex align-items-end">
            <div className="form-check">
              <input id="oficial" type="checkbox" className="form-check-input" checked={form.oficial_enade}
                onChange={(e) => setForm({ ...form, oficial_enade: e.target.checked })} />
              <label htmlFor="oficial" className="form-check-label">Questão oficial do ENADE</label>
            </div>
          </div>
        </div>
        <Campo rotulo="Fonte" value={form.fonte} onChange={alterar('fonte')} erro={erros.fonte} maxLength={255}
          ajuda="Ex.: ENADE 2021 — Prova de ADS, questão 12 (INEP). Questões autorais devem ser identificadas como tal." />

        <fieldset className="mt-2">
          <legend className="form-label">Alternativas <span className="text-secondary small">(marque a correta)</span></legend>
          {erros.correta && <div className="text-danger small mb-2">{erros.correta}</div>}
          {LETRAS.map((letra, i) => (
            <div key={letra} className="input-group mb-2 has-validation">
              <div className="input-group-text">
                <input type="radio" className="form-check-input mt-0" name="correta" aria-label={`Alternativa ${letra} é a correta`}
                  checked={form.correta === letra} onChange={() => setForm({ ...form, correta: letra })} />
                <span className="ms-2 fw-semibold">{letra}</span>
              </div>
              <input type="text" className={`form-control ${erros[`alternativa_${letra}`] ? 'is-invalid' : ''}`}
                aria-label={`Texto da alternativa ${letra}`} value={form.alternativas[i]} maxLength={2000}
                onChange={(e) => setForm({ ...form, alternativas: form.alternativas.map((t, j) => (j === i ? e.target.value : t)) })} />
              {erros[`alternativa_${letra}`] && <div className="invalid-feedback">{erros[`alternativa_${letra}`]}</div>}
            </div>
          ))}
        </fieldset>

        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-dark" disabled={salvando}>{questaoId ? 'Salvar alterações' : 'Cadastrar questão'}</button>
          <Link to="/admin" className="btn btn-outline-secondary">Cancelar</Link>
        </div>
      </div>
    </form>
  )
}

// RF006–RF010: cadastro e edição de questões (professores e administradores)
export default function QuestaoForm() {
  const { id } = useParams()
  const existente = useRequisicao(id ? `/questoes/${id}` : null)

  return (
    <div className="mx-auto" style={{ maxWidth: 900 }}>
      <CabecalhoPagina titulo={id ? 'Editar questão' : 'Nova questão'} subtitulo="Classifique por curso, ano, tema e dificuldade." />
      {id && existente.carregando && <Carregando />}
      <Alerta>{existente.erro?.message}</Alerta>
      {id && existente.dados && !existente.dados.pode_editar && <Alerta>Você não pode editar esta questão.</Alerta>}
      {!id && <Formulario inicial={vazio()} />}
      {id && existente.dados?.pode_editar && <Formulario key={id} inicial={deQuestao(existente.dados)} questaoId={id} />}
    </div>
  )
}
