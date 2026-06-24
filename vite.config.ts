import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

// Standard Vite layout config with path fallbacks
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      './index.css': fileURLToPath(new URL('./src/styles/theme.css', import.meta.url)),
      '../index.css': fileURLToPath(new URL('./src/styles/theme.css', import.meta.url)),
    }
  }
})