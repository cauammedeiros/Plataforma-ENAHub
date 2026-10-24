import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/contextos'
import Carregando from './Carregando'

// Libera a rota apenas para usuários logados (e, opcionalmente, com certos perfis)
export default function RotaProtegida({ perfis }) {
  const { usuario, carregando } = useAuth()
  const local = useLocation()

  if (carregando) return <Carregando tela />
  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname + local.search }} />
  if (perfis && !perfis.includes(usuario.perfil)) return <Navigate to="/" replace />
  return <Outlet />
}

// Telas de login/cadastro: quem já está logado vai direto ao início
export function RotaPublica() {
  const { usuario, carregando } = useAuth()
  if (carregando) return <Carregando tela />
  if (usuario) return <Navigate to="/" replace />
  return <Outlet />
}
