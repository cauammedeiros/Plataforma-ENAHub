import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RotaProtegida, { RotaPublica } from './components/RotaProtegida'
import Admin from './pages/Admin'
import BancoQuestoes from './pages/BancoQuestoes'
import Cadastro from './pages/Cadastro'
import Desempenho from './pages/Desempenho'
import EsqueciSenha from './pages/EsqueciSenha'
import Favoritas from './pages/Favoritas'
import Forum from './pages/Forum'
import Inicio from './pages/Inicio'
import Login from './pages/Login'
import NaoEncontrada from './pages/NaoEncontrada'
import Perfil from './pages/Perfil'
import QuestaoDetalhe from './pages/QuestaoDetalhe'
import QuestaoForm from './pages/QuestaoForm'
import RedefinirSenha from './pages/RedefinirSenha'
import Resultado from './pages/Resultado'
import SimuladoExecucao from './pages/SimuladoExecucao'
import Simulados from './pages/Simulados'
import Termos from './pages/Termos'
import Topico from './pages/Topico'

function App() {
  return (
    <Routes>
      <Route element={<RotaPublica />}>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      </Route>
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/termos" element={<Termos />} />

      <Route element={<RotaProtegida />}>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="questoes" element={<BancoQuestoes />} />
          <Route path="questoes/:id" element={<QuestaoDetalhe />} />
          <Route path="simulados" element={<Simulados />} />
          <Route path="simulados/:id" element={<SimuladoExecucao />} />
          <Route path="simulados/:id/resultado" element={<Resultado />} />
          <Route path="desempenho" element={<Desempenho />} />
          <Route path="favoritas" element={<Favoritas />} />
          <Route path="forum" element={<Forum />} />
          <Route path="forum/:id" element={<Topico />} />
          <Route path="perfil" element={<Perfil />} />

          <Route element={<RotaProtegida perfis={['admin', 'professor']} />}>
            <Route path="admin" element={<Admin />} />
            <Route path="admin/questoes/nova" element={<QuestaoForm />} />
            <Route path="admin/questoes/:id/editar" element={<QuestaoForm />} />
          </Route>
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
