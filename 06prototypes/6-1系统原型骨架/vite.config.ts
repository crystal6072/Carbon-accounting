import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/caronacounting/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 端口被占用时直接报错，避免静默漂移到 5200 等随机端口导致访问地址不可预期
    strictPort: true,
    host: true,
    open: false,
  },
})
