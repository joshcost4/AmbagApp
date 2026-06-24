import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // If any old module tries to look for index.css in src, route it to your theme file
      './index.css': path.resolve(__dirname, './src/styles/theme.css'),
      '../index.css': path.resolve(__dirname, './src/styles/theme.css'),
    }
  }
})