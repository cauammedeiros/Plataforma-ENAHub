import { Link } from 'react-router-dom'

// RNF003.2 — termos de uso e política de privacidade (texto acadêmico, sem valor jurídico)
export default function Termos() {
  return (
    <main className="container py-5" style={{ maxWidth: 760 }}>
      <Link to="/" className="small">← Voltar</Link>
      <h1 className="h3 fw-bold mt-3">Termos de uso e política de privacidade</h1>
      <p className="text-secondary small">
        O ENAHub é um projeto acadêmico da disciplina Desenvolvimento de Plataformas Web (UNIFOR). Este texto explica
        como os dados são tratados, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
      </p>
      <h2 className="h5 mt-4">Dados coletados</h2>
      <p>Nome, e-mail, curso, instituição de ensino, senha (armazenada apenas como hash), respostas e resultados dos
        simulados, questões favoritas, publicações no fórum e registros de acesso (data do login).</p>
      <h2 className="h5 mt-4">Finalidade</h2>
      <p>Os dados são usados somente para autenticar o usuário, registrar o progresso nos estudos, gerar estatísticas
        de desempenho, o ranking (exibido com nome abreviado) e relatórios administrativos agregados.</p>
      <h2 className="h5 mt-4">Seus direitos</h2>
      <p>Você pode consultar e corrigir seus dados na página de perfil e excluir sua conta a qualquer momento. A exclusão
        remove permanentemente seus dados pessoais, simulados, favoritos e publicações.</p>
      <h2 className="h5 mt-4">Conteúdo</h2>
      <p>As questões marcadas como <strong>demonstrativas</strong> foram elaboradas pela equipe para testes e não são
        questões oficiais do ENADE/INEP. Publicações ofensivas no fórum podem ser denunciadas e removidas pela administração.</p>
    </main>
  )
}
