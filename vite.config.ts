import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Project Pages URL: https://foxykeep.github.io/ScreenshotTool/
  base: '/ScreenshotTool/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4521,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4521,
    strictPort: true,
  },
})
