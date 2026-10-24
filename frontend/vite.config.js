import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_API_PROXY pode vir do ambiente ou de frontend/.env.local (não versionado),
  // o que funciona igual no macOS, Linux e Windows
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      // Em desenvolvimento, /api é encaminhado para o back-end (evita problemas de CORS)
      proxy: {
        '/api': env.VITE_API_PROXY || 'http://localhost:3000',
      },
    },
  }
})
