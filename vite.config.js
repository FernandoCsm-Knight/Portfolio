import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { resolve } from 'node:path'
import pexelsHandler from './api/pexels.js'
import { llmsContent } from './scripts/llms.js'
import { FANNAR_PAGES, fannarContent } from './src/fannar/vitePlugin.js'

function localPexelsApi() {
  function attach(server) {
    server.middlewares.use('/api/pexels', (request, response) => {
      void pexelsHandler(request, response)
    })
  }
  return {
    name: 'local-pexels-api',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (!process.env.PEXELS_API_KEY && env.PEXELS_API_KEY) {
    process.env.PEXELS_API_KEY = env.PEXELS_API_KEY
  }
  return {
    plugins: [react(), localPexelsApi(), llmsContent(env), fannarContent()],
    build: {
      rollupOptions: {
        /* O portfólio (index.html) e o módulo Fannar (src/fannar), servido em
           fannar.fernandocsdm.com pelo middleware.js. */
        input: {
          main: resolve(import.meta.dirname, 'index.html'),
          ...Object.fromEntries(Object.entries(FANNAR_PAGES).map(([name, file]) => [name, resolve(import.meta.dirname, file)])),
        },
      },
    },
  }
})
