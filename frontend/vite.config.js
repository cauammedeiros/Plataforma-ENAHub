import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Em desenvolvimento, /api é encaminhado para o back-end (evita problemas de CORS)
    // (se o back-end usar outra porta: VITE_API_PROXY=http://localhost:3001 npm run dev)
    proxy: {
      '/api': process.env.VITE_API_PROXY || 'http://localhost:3000',
    },
  },
})
