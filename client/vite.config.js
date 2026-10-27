import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const emptyModule = path.resolve(__dirname, 'src/utils/empty.js')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      canvg: emptyModule,
      html2canvas: emptyModule,
      dompurify: emptyModule,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      }
    }
  }
})
