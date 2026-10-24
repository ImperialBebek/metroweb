import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defaultClientConditions, defineConfig } from 'vite'
import { designDocs } from './scripts/design-docs.ts'

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), designDocs({ dir: path('../../docs/design') })],
  // metroweb resolves to its TypeScript source, not its build, so library
  // changes show up live and the phone never runs a stale dist.
  resolve: { conditions: ['@metroweb/source', ...defaultClientConditions] },
  build: {
    rolldownOptions: {
      input: { main: path('index.html'), design: path('design/index.html') },
    },
  },
})
