import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Определяем base path
const getBasePath = (): string => {
  if (process.env.GITHUB_PAGES === 'true') {
    return process.env.GITHUB_REPOSITORY 
      ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` 
      : '/population-diagram/';
  }
  return '/';
};

const basePath = getBasePath();

// Плагин для замены абсолютных путей в HTML на пути с base
const htmlBasePathPlugin = (): Plugin => {
  return {
    name: 'html-base-path',
    transformIndexHtml(html: string) {
      // Заменяем абсолютные пути на пути с base path
      let result = html.replace(
        /href="\/(favicon\.svg|manifest\.json)"/g,
        `href="${basePath}$1"`
      );
      
      // Для всех HTML файлов обновляем пути к скриптам и стилям с base path
      if (basePath !== '/') {
        // Обновляем пути к скриптам
        result = result.replace(
          /(src|href)="\/(assets\/[^"]+)"/g,
          `$1="${basePath}$2"`
        );
      }
      
      return result;
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      include: '**/*.{jsx,tsx}',
      babel: {
        plugins: [],
      },
    }),
    htmlBasePathPlugin(),
  ],
  // Base path для GitHub Pages
  base: basePath,
  build: {
    rollupOptions: {
      // Множественные точки входа: основная страница и embed страница
      input: {
        main: './index.html',
        embed: './embed.html',
      },
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
