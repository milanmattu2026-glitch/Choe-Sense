import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rootEnv = loadEnv(mode, path.resolve(process.cwd(), '..'), '')
  const mergedEnv = { ...rootEnv, ...env }

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['maplibre-gl']
    },
    define: {
      'process.env': JSON.stringify(mergedEnv),
      'window.__ENV__': JSON.stringify(mergedEnv)
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true,
      proxy: {
        '/api': 'http://localhost:8000',
        '/webhook': 'http://localhost:8000',
      },
    },
  }
})
