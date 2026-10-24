import { Link } from 'react-router-dom'
import EstadoVazio from '../components/EstadoVazio'

export default function NaoEncontrada() {
  return (
    <div className="card">
      <EstadoVazio titulo="Página não encontrada" acao={<Link to="/" className="btn btn-dark btn-sm">Ir para o início</Link>}>
        O endereço acessado não existe ou foi removido.
      </EstadoVazio>
    </div>
  )
}
