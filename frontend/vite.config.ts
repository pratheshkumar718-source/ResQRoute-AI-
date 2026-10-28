import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// All traffic goes to the LOCAL FastAPI backend (no external services).
const backend = 'http://127.0.0.1:8000'
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/evidence': backend,
      '/ws': { target: 'ws://127.0.0.1:8000', ws: true },
    },
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/.venv/**']
    }
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/evidence': backend,
      '/ws': { target: 'ws://127.0.0.1:8000', ws: true },
    },
  }
})
