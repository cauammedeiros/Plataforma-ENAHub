import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth, useToast } from '../contexts/contextos'
import { PERFIS } from '../utils/formatar'

const LINKS = [
  { para: '/', rotulo: 'Início', fim: true },
  { para: '/simulados', rotulo: 'Simulados' },
  { para: '/questoes', rotulo: 'Questões' },
  { para: '/desempenho', rotulo: 'Desempenho' },
  { para: '/forum', rotulo: 'Fórum' },
]

export default function Navbar() {
  const { usuario, sair } = useAuth()
  const toast = useToast()
  const navegar = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [contaAberta, setContaAberta] = useState(false)

  const fechar = () => {
    setMenuAberto(false)
    setContaAberta(false)
  }

  async function handleSair() {
    fechar()
    await sair()
    toast.info('Você saiu da sua conta.')
    navegar('/login')
  }

  const links = [...LINKS]
  if (usuario.perfil === 'admin') links.push({ para: '/admin', rotulo: 'Administração' })
  else if (usuario.perfil === 'professor') links.push({ para: '/admin', rotulo: 'Gestão' })

  return (
    <nav className="navbar navbar-expand-lg navbar-dark app-navbar">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/" onClick={fechar}>
          ENAHub
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="menu-principal"
          aria-expanded={menuAberto}
          aria-label="Abrir menu"
          onClick={() => setMenuAberto((v) => !v)}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse ${menuAberto ? 'show' : ''}`} id="menu-principal">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
            {links.map((l) => (
              <li className="nav-item" key={l.para}>
                <NavLink className="nav-link" to={l.para} end={l.fim} onClick={fechar}>
                  {l.rotulo}
                </NavLink>
              </li>
            ))}
            <li className="nav-item dropdown ms-lg-3">
              <button
                type="button"
                className="nav-link dropdown-toggle btn btn-link"
                aria-expanded={contaAberta}
                onClick={() => setContaAberta((v) => !v)}
              >
                <span className="avatar" aria-hidden="true">{usuario.nome.charAt(0).toUpperCase()}</span>
                <span className="d-lg-none ms-2">{usuario.nome}</span>
              </button>
              <ul className={`dropdown-menu dropdown-menu-end ${contaAberta ? 'show' : ''}`}>
                <li className="dropdown-header">
                  <div className="fw-semibold text-body">{usuario.nome}</div>
                  <small>{PERFIS[usuario.perfil]}</small>
                </li>
                <li><Link className="dropdown-item" to="/perfil" onClick={fechar}>Meu perfil</Link></li>
                <li><Link className="dropdown-item" to="/favoritas" onClick={fechar}>Questões favoritas</Link></li>
                <li><Link className="dropdown-item" to="/desempenho" onClick={fechar}>Histórico</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button type="button" className="dropdown-item" onClick={handleSair}>Sair</button></li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}
