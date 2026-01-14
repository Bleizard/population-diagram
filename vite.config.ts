import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path для GitHub Pages
  // Автоматически определяется из GITHUB_REPOSITORY или можно задать вручную
  base: process.env.GITHUB_PAGES === 'true' 
    ? (process.env.GITHUB_REPOSITORY 
        ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` 
        : '/population-diagram/')
    : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Выносим тяжёлые библиотеки в отдельные чанки
          'vendor-react': ['react', 'react-dom'],
          'vendor-echarts': ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers', 'echarts-for-react'],
          'vendor-xlsx': ['xlsx'],
          'vendor-parsers': ['papaparse'],
        },
      },
    },
  },
})
