import { useAuth } from '../contexts/contextos'
import { PERFIS } from '../utils/formatar'
import BotaoDenunciar from './BotaoDenunciar'

function linkSeguro(url) {
  return /^https?:\/\//i.test(url || '') ? url : null
}

// Gabarito comentado: explicações com texto, imagem e vídeo (RF024, RF025)
export default function Comentarios({ comentarios, aoExcluir }) {
  const { usuario } = useAuth()
  if (!comentarios?.length) {
    return <p className="small text-secondary mb-0">Ainda não há comentários para esta questão.</p>
  }
  return (
    <div className="d-flex flex-column gap-3">
      {comentarios.map((c) => (
        <div key={c.id} className="comentario">
          <div className="small text-secondary mb-1">
            <strong className="text-body">{c.autor || 'Usuário removido'}</strong>
            {c.autor_perfil && ` · ${PERFIS[c.autor_perfil]}`}
          </div>
          <p className="mb-2 texto-quebra">{c.texto}</p>
          {linkSeguro(c.imagem_url) && (
            <img src={c.imagem_url} alt="Imagem de apoio à explicação" className="img-fluid rounded border mb-2" loading="lazy" />
          )}
          {linkSeguro(c.video_url) && (
            <a href={c.video_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-dark">
              ▶ Assistir vídeo explicativo
            </a>
          )}
          <div className="d-flex gap-3 mt-1">
            {aoExcluir && (usuario.perfil === 'admin' || c.usuario_id === usuario.id) && (
              <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={() => aoExcluir(c.id)}>
                Remover
              </button>
            )}
            {c.usuario_id !== usuario.id && <BotaoDenunciar tipo="comentario" id={c.id} />}
          </div>
        </div>
      ))}
    </div>
  )
}
