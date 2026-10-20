import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { designDocs } from './scripts/design-docs.ts'

const entry = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), designDocs()],
  build: {
    rolldownOptions: {
      input: { main: entry('index.html'), design: entry('design/index.html') },
    },
  },
})
