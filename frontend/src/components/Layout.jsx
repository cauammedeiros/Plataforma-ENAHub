import { Link, Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <a href="#conteudo" className="visually-hidden-focusable">Pular para o conteúdo</a>
      <Navbar />
      <main id="conteudo" className="flex-grow-1 py-4 py-md-5">
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="app-footer py-3">
        <div className="container d-flex flex-wrap justify-content-between gap-2 small">
          <span>© 2026 ENAHub · Ciência da Computação · UNIFOR</span>
          <Link to="/termos">Termos de uso e privacidade</Link>
        </div>
      </footer>
    </div>
  )
}
