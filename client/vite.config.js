import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(version),
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 7005,
    proxy: {
      '/api': 'http://localhost:3008',
    },
  },
})
