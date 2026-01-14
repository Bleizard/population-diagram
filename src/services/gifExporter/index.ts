import GIF from 'gif.js';

// Копируем worker из node_modules в public при сборке
// Worker будет загружен с учётом base path для GitHub Pages
const WORKER_URL = `${import.meta.env.BASE_URL}gif.worker.js`;

export interface GifExportOptions {
  /** Массив годов для анимации */
  years: number[];
  /** Задержка между кадрами в мс */
  frameDelay: number;
  /** Качество GIF (1-30, меньше = лучше) */
  quality?: number;
  /** Ширина GIF */
  width?: number;
  /** Высота GIF */
  height?: number;
  /** Callback для обновления прогресса */
  onProgress?: (progress: number, currentYear: number) => void;
  /** Функция для получения canvas графика для заданного года */
  getChartCanvas: (year: number) => Promise<HTMLCanvasElement>;
}

export interface GifExportResult {
  blob: Blob;
  url: string;
}

/**
 * Экспортирует анимацию графика в GIF
 */
export async function exportToGif(options: GifExportOptions): Promise<GifExportResult> {
  const {
    years,
    frameDelay,
    quality = 10,
    width,
    height,
    onProgress,
    getChartCanvas,
  } = options;

  return new Promise(async (resolve, reject) => {
    try {
      // Получаем первый кадр для определения размеров
      const firstCanvas = await getChartCanvas(years[0]);
      const gifWidth = width || firstCanvas.width;
      const gifHeight = height || firstCanvas.height;

      // Создаём GIF encoder
      const gif = new GIF({
        workers: 2,
        quality,
        width: gifWidth,
        height: gifHeight,
        workerScript: WORKER_URL,
      });

      // Добавляем кадры
      for (let i = 0; i < years.length; i++) {
        const year = years[i];
        
        if (onProgress) {
          onProgress((i / years.length) * 80, year); // 80% на захват кадров
        }

        const canvas = await getChartCanvas(year);
        
        // Масштабируем canvas если нужно
        const scaledCanvas = scaleCanvas(canvas, gifWidth, gifHeight);
        
        gif.addFrame(scaledCanvas, { delay: frameDelay });
      }

      // Обработчик прогресса рендеринга
      gif.on('progress', (p) => {
        if (onProgress) {
          onProgress(80 + p * 20, years[years.length - 1]); // 20% на рендеринг
        }
      });

      // Обработчик завершения
      gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        resolve({ blob, url });
      });

      // Запускаем рендеринг
      gif.render();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Масштабирует canvas до заданных размеров
 */
function scaleCanvas(
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  if (source.width === targetWidth && source.height === targetHeight) {
    return source;
  }

  const scaled = document.createElement('canvas');
  scaled.width = targetWidth;
  scaled.height = targetHeight;
  
  const ctx = scaled.getContext('2d');
  if (ctx) {
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  }
  
  return scaled;
}

/**
 * Конвертирует SVG элемент в Canvas
 */
export async function svgToCanvas(svgElement: SVGSVGElement): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Получаем размеры SVG
    const bbox = svgElement.getBoundingClientRect();
    canvas.width = bbox.width;
    canvas.height = bbox.height;

    // Сериализуем SVG
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
    img.src = url;
  });
}

/**
 * Скачивает GIF файл
 */
export function downloadGif(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Рассчитывает задержку между кадрами на основе скорости воспроизведения
 */
export function calculateFrameDelay(speed: number): number {
  // Скорости: 0.5x, 1x, 2x, 4x
  // Базовая задержка 1000ms при скорости 1x
  const baseDelay = 1000;
  return Math.round(baseDelay / speed);
}

