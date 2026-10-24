# ENAHub — Front-end

Aplicação React (Vite + React Router + Bootstrap). Instruções completas no [README principal](../README.md).

```bash
npm install
npm run dev      # http://localhost:5173 (encaminha /api para http://localhost:3000)
npm run lint
npm run build
```

Estrutura de `src/`:

- `api/cliente.js`: chamadas HTTP à API (token, erros, query string)
- `contexts/`: sessão do usuário (AuthProvider) e mensagens de feedback (ToastProvider)
- `hooks/useRequisicao.js`: carregamento de dados com estado de carregando/erro
- `components/`: componentes reutilizáveis (Campo, Modal, Alternativas, InfoQuestao, BarraPercentual...)
- `pages/`: uma tela por arquivo
- `utils/`: formatação e validação
