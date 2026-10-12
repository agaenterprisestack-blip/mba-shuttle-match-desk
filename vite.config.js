import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/mba-shuttle-match-desk/',
  plugins: [react()],
})
