import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Определяем base path
const getBasePath = () => {
  if (process.env.GITHUB_PAGES === 'true') {
    return process.env.GITHUB_REPOSITORY 
      ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` 
      : '/population-diagram/';
  }
  return '/';
};

const basePath = getBasePath();

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Плагин для замены абсолютных путей в HTML на пути с base
    {
      name: 'html-base-path',
      transformIndexHtml: {
        enforce: 'pre',
        transform(html) {
          // Заменяем абсолютные пути на пути с base path
          return html.replace(
            /href="\/(favicon\.svg|manifest\.json)"/g,
            `href="${basePath}$1"`
          );
        },
      },
    },
  ],
  // Base path для GitHub Pages
  base: basePath,
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
