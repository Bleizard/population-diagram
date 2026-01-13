import { useCallback } from 'react';
import type ReactECharts from 'echarts-for-react';
import { THEME_COLORS } from './chartColors';
import type { Theme } from '../../../hooks';

/** Методы экспорта графика */
export interface ChartExportMethods {
  /** Экспортировать график в SVG и скачать файл */
  exportToSvg: (filename?: string) => void;
  /** Получить canvas с текущим состоянием графика */
  getCanvas: () => Promise<HTMLCanvasElement>;
}

/**
 * Хук для экспорта графика в различные форматы
 */
export function useChartExport(
  chartRef: React.RefObject<ReactECharts | null>,
  theme: Theme
): ChartExportMethods {
  
  const exportToSvg = useCallback((filename?: string) => {
    const echartsInstance = chartRef.current?.getEchartsInstance();
    if (!echartsInstance) return;
    
    // Получаем DOM элемент ECharts
    const echartsDOM = echartsInstance.getDom();
    const svgElement = echartsDOM?.querySelector('svg');
    
    if (!svgElement) return;
    
    // Клонируем SVG чтобы не модифицировать оригинал
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Получаем текущие размеры
    const width = svgElement.getAttribute('width') || svgElement.clientWidth.toString();
    const height = svgElement.getAttribute('height') || svgElement.clientHeight.toString();
    
    // Убираем 'px' если есть
    const numWidth = parseFloat(width);
    const numHeight = parseFloat(height);
    
    // Устанавливаем viewBox для масштабируемости
    if (!svgClone.getAttribute('viewBox')) {
      svgClone.setAttribute('viewBox', `0 0 ${numWidth} ${numHeight}`);
    }
    
    // Устанавливаем 100% для адаптивности
    svgClone.setAttribute('width', '100%');
    svgClone.setAttribute('height', '100%');
    
    // Добавляем preserveAspectRatio для корректного масштабирования
    svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    // Добавляем фоновый цвет как первый элемент
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', THEME_COLORS[theme].background);
    svgClone.insertBefore(bgRect, svgClone.firstChild);
    
    // Сериализуем в строку
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgClone);
    
    // Добавляем XML declaration
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
    
    // Создаём Blob и скачиваем
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = filename || `population-pyramid-${Date.now()}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Освобождаем URL
    URL.revokeObjectURL(url);
  }, [chartRef, theme]);
  
  const getCanvas = useCallback(async (): Promise<HTMLCanvasElement> => {
    const echartsInstance = chartRef.current?.getEchartsInstance();
    if (!echartsInstance) {
      throw new Error('Chart instance not available');
    }
    
    // Получаем DOM элемент ECharts
    const echartsDOM = echartsInstance.getDom();
    const svgElement = echartsDOM?.querySelector('svg');
    
    if (!svgElement) {
      throw new Error('SVG element not found');
    }
    
    // Создаём canvas
    const canvas = document.createElement('canvas');
    const bbox = svgElement.getBoundingClientRect();
    canvas.width = bbox.width;
    canvas.height = bbox.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Сериализуем SVG
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    return new Promise<HTMLCanvasElement>((resolve, reject) => {
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
  }, [chartRef]);
  
  return { exportToSvg, getCanvas };
}

