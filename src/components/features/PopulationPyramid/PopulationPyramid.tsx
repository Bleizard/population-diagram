import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useMemo, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import type { PopulationData } from '../../../types';
import type { Theme } from '../../../hooks';
import type { ViewMode } from '../../common/ViewModeToggle';
import { transformToChartData, extractChartMetadata } from '../../../services/dataTransformer';
import { CHART_CONFIG } from '../../../constants';
import { useI18n } from '../../../i18n';
import { formatPopulation } from '../../../utils';
import styles from './PopulationPyramid.module.css';

/** Методы, доступные через ref */
export interface PopulationPyramidRef {
  /** Экспортировать график в SVG и скачать файл */
  exportToSvg: (filename?: string) => void;
  /** Получить canvas с текущим состоянием графика */
  getCanvas: () => Promise<HTMLCanvasElement>;
}

import type { ColorProfile } from '../../../types';

interface PopulationPyramidProps {
  /** Данные о населении */
  data: PopulationData;
  /** Исходные данные для расчёта медианы (для агрегированных графиков) */
  sourceDataForMedian?: PopulationData;
  /** Текущая тема */
  theme?: Theme;
  /** Режим отображения: split (по полу) или combined (суммарно) */
  viewMode?: ViewMode;
  /** Кастомный максимум для оси X (если не задан, вычисляется автоматически) */
  maxScale?: number;
  /** Интервал отображения меток оси Y */
  yAxisInterval?: number | 'auto' | ((index: number, value: string) => boolean);
  /** Кастомное название графика */
  customTitle?: string;
  /** Показывать общую сумму населения */
  showTotal?: boolean;
  /** Количество делений оси X (с каждой стороны от 0) */
  xAxisSplitCount?: number;
  /** Показывать значения внутри столбиков */
  showBarLabels?: boolean;
  /** Цветовой профиль */
  colorProfile?: ColorProfile;
  /** Показывать медианную линию */
  showMedianLine?: boolean;
  /** Отображать данные в процентах */
  showAsPercentage?: boolean;
  /** Дополнительный CSS класс */
  className?: string;
}

/**
 * Цветовые профили для диаграммы
 */
const COLOR_PROFILES = {
  pale: {
    light: {
      male: '#93c5fd',
      maleSurplus: '#3b82f6',
      female: '#fda4af',
      femaleSurplus: '#f43f5e',
      total: '#3b82f6',
      totalGradientStart: '#60a5fa',
      totalGradientEnd: '#2563eb',
    },
    dark: {
      male: '#7dd3fc',
      maleSurplus: '#38bdf8',
      female: '#fda4af',
      femaleSurplus: '#fb7185',
      total: '#60a5fa',
      totalGradientStart: '#93c5fd',
      totalGradientEnd: '#3b82f6',
    },
  },
  contrast: {
    light: {
      male: '#60a5fa',
      maleSurplus: '#1d4ed8',
      female: '#f87171',
      femaleSurplus: '#991b1b',
      total: '#2563eb',
      totalGradientStart: '#3b82f6',
      totalGradientEnd: '#1e40af',
    },
    dark: {
      male: '#3b82f6',
      maleSurplus: '#1e40af',
      female: '#ef4444',
      femaleSurplus: '#7f1d1d',
      total: '#3b82f6',
      totalGradientStart: '#60a5fa',
      totalGradientEnd: '#1d4ed8',
    },
  },
};

/**
 * Цвета темы (не зависящие от профиля)
 */
const THEME_COLORS = {
  light: {
    text: '#374151',
    textSecondary: '#6b7280',
    grid: '#e5e7eb',
    centerLine: '#9ca3af',
    background: '#ffffff',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
    medianLine: '#059669',
  },
  dark: {
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    grid: '#334155',
    centerLine: '#64748b',
    background: '#1e293b',
    tooltipBg: '#1e293b',
    tooltipBorder: '#475569',
    medianLine: '#34d399',
  },
};

/**
 * Компонент половозрастной пирамиды населения
 * Использует ECharts для отображения горизонтальной гистограммы
 */
export const PopulationPyramid = forwardRef<PopulationPyramidRef, PopulationPyramidProps>(
  function PopulationPyramid({ 
    data,
    sourceDataForMedian,
    theme = 'light', 
    viewMode = 'split',
    maxScale,
    yAxisInterval = 0,
    customTitle,
    showTotal = false,
    xAxisSplitCount = 5,
    showBarLabels = false,
    colorProfile = 'pale',
    showMedianLine = false,
    showAsPercentage = false,
    className 
  }, ref) {
  const { t } = useI18n();
  const chartRef = useRef<ReactECharts>(null);
  
  // Экспортируем методы через ref
  useImperativeHandle(ref, () => ({
    exportToSvg: (filename?: string) => {
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
    },
    
    getCanvas: async () => {
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
    },
  }), [theme]);
  const chartData = useMemo(() => transformToChartData(data), [data]);
  const metadata = useMemo(() => extractChartMetadata(data), [data]);
  
  // Комбинируем цвета профиля и темы
  const effectiveColorProfile = colorProfile || 'pale';
  const profileColors = COLOR_PROFILES[effectiveColorProfile][theme];
  const themeColors = THEME_COLORS[theme];
  const colors = { ...profileColors, ...themeColors };
  
  // Локализованные метки
  const LEGEND_LABELS = useMemo(() => ({
    male: t.common.males,
    maleSurplus: t.common.maleSurplus,
    female: t.common.females,
    femaleSurplus: t.common.femaleSurplus,
  }), [t]);
  
  const AXIS_LABELS = useMemo(() => ({
    age: t.common.age,
    population: t.common.population,
  }), [t]);
  
  // Используем кастомное название если оно задано
  const effectiveTitle = customTitle?.trim() || metadata.title;
  
  // Вычисляем общие суммы
  const totals = useMemo(() => {
    let male = 0;
    let female = 0;
    for (const group of data.ageGroups) {
      male += group.male;
      female += group.female;
    }
    return { male, female, total: male + female };
  }, [data.ageGroups]);
  
  // Вычисляем медианный возраст (используем исходные данные если есть)
  const medianAge = useMemo(() => {
    // Для агрегированных графиков используем исходные данные
    const ageGroups = sourceDataForMedian?.ageGroups ?? data.ageGroups;
    
    // Считаем общую популяцию из тех же данных
    let totalPopulation = 0;
    for (const group of ageGroups) {
      totalPopulation += group.male + group.female;
    }
    
    const halfPopulation = totalPopulation / 2;
    
    let cumulative = 0;
    for (const group of ageGroups) {
      cumulative += group.male + group.female;
      if (cumulative >= halfPopulation) {
        return group.ageNumeric;
      }
    }
    return 0;
  }, [data.ageGroups, sourceDataForMedian]);
  
  // Используем кастомный масштаб или из метаданных
  const effectiveMaxScale = maxScale ?? metadata.maxValue;

  // Количество групп
  const groupCount = data.ageGroups.length;
  
  // Минимальная высота графика
  const minChartHeight = groupCount <= 10 ? 400 : CHART_CONFIG.minHeight;
  
  // Высота диаграммы зависит от количества возрастных групп
  const chartHeight = Math.max(
    minChartHeight,
    groupCount * CHART_CONFIG.heightPerAge + 
    CHART_CONFIG.padding.top + 
    CHART_CONFIG.padding.bottom
  );
  
  // Доступная высота для данных (без отступов и заголовка)
  const availableHeight = chartHeight - CHART_CONFIG.padding.top - CHART_CONFIG.padding.bottom - 80;
  
  // Динамическая высота бара — занимаем ~70% доступного пространства на группу
  const dynamicBarHeight = useMemo(() => {
    const maxBarHeight = Math.floor((availableHeight / groupCount) * 0.7);
    // Ограничиваем: минимум 10, максимум 60
    return Math.max(10, Math.min(60, maxBarHeight));
  }, [availableHeight, groupCount]);

  // Индекс медианного возраста для линии
  const medianAgeIndex = useMemo(() => {
    // Сначала пробуем точное совпадение
    const exactIndex = data.ageGroups.findIndex(g => g.ageNumeric === medianAge);
    if (exactIndex >= 0) return exactIndex;
    
    // Для агрегированных данных ищем группу, содержащую медианный возраст
    // Группы отсортированы по ageNumeric, ищем первую группу с ageNumeric > medianAge
    // и берём предыдущую (или последнюю если медиана больше всех)
    for (let i = 0; i < data.ageGroups.length; i++) {
      const next = data.ageGroups[i + 1];
      
      // Если следующей группы нет или её ageNumeric > medianAge, текущая содержит медиану
      if (!next || next.ageNumeric > medianAge) {
        return i;
      }
    }
    
    return data.ageGroups.length - 1;
  }, [data.ageGroups, medianAge]);

  // Функция конвертации в проценты
  const toPercent = useCallback((value: number) => {
    return totals.total > 0 ? (value / totals.total) * 100 : 0;
  }, [totals.total]);

  // Конфигурация для режима "split" (по полу)
  const splitOption: EChartsOption = useMemo(() => {
    const ageLabels = chartData.map((item) => item.age);
    
    // Конвертируем данные в проценты если нужно
    const convertValue = (val: number) => showAsPercentage ? toPercent(val) : val;
    
    const maleBaseData = chartData.map((item) => convertValue(item.maleBase));
    const maleSurplusData = chartData.map((item) => convertValue(item.maleSurplus));
    const femaleBaseData = chartData.map((item) => convertValue(item.femaleBase));
    const femaleSurplusData = chartData.map((item) => convertValue(item.femaleSurplus));
    
    // Максимум для шкалы
    const scaleMax = showAsPercentage 
      ? Math.ceil(toPercent(effectiveMaxScale) * 10) / 10
      : effectiveMaxScale;

    return {
      backgroundColor: colors.background,
      title: {
        text: effectiveTitle,
        subtext: metadata.subtitle || '',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 28,
          fontWeight: 600,
          fontFamily: "'Playfair Display', Georgia, serif",
          color: colors.text,
        },
        subtextStyle: {
          fontSize: 18,
          fontWeight: 500,
          color: colors.textSecondary,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { 
          type: 'line',
          lineStyle: {
            color: colors.centerLine,
            type: 'dashed',
          },
        },
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text },
        formatter: (params: unknown) => {
          const items = params as Array<{
            axisValue: string;
            seriesName: string;
            seriesIndex: number;
            value: number;
          }>;
          
          if (!Array.isArray(items) || items.length === 0) return '';
          
          const age = items[0].axisValue;
          let maleTotal = 0;
          let femaleTotal = 0;
          
          // seriesIndex 0,1 = male (base + surplus), seriesIndex 2,3 = female (base + surplus)
          items.forEach((item) => {
            const value = Math.abs(item.value);
            if (item.seriesIndex < 2) {
              maleTotal += value;
            } else {
              femaleTotal += value;
            }
          });
          
          return `
            <div style="font-family: 'DM Sans', sans-serif; padding: 4px 0; color: ${colors.text};">
              <div style="font-weight: 600; margin-bottom: 8px;">${AXIS_LABELS.age}: ${age}</div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${colors.male}; border-radius: 2px;"></span>
                <span>${LEGEND_LABELS.male}: ${formatPopulation(maleTotal)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${colors.female}; border-radius: 2px;"></span>
                <span>${LEGEND_LABELS.female}: ${formatPopulation(femaleTotal)}</span>
              </div>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${colors.grid};">
                <strong>${t.common.total}: ${formatPopulation(maleTotal + femaleTotal)}</strong>
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: [
          LEGEND_LABELS.male,
          LEGEND_LABELS.maleSurplus,
          LEGEND_LABELS.female,
          LEGEND_LABELS.femaleSurplus,
        ],
        top: CHART_CONFIG.padding.top + 55,
        left: '16%',
        orient: 'vertical',
        itemGap: 6,
        itemWidth: 14,
        itemHeight: 10,
        selectedMode: false,
        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderRadius: 4,
        padding: [8, 12],
        textStyle: {
          fontSize: 11,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      grid: {
        left: '15%',
        right: '15%',
        top: CHART_CONFIG.padding.top + 50,
        bottom: CHART_CONFIG.padding.bottom,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        min: -scaleMax,
        max: scaleMax,
        splitNumber: xAxisSplitCount * 2,
        axisLabel: {
          formatter: (value: number) => showAsPercentage 
            ? `${Math.abs(value).toFixed(1)}%`
            : formatPopulation(Math.abs(value)),
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          fontSize: 11,
          color: colors.textSecondary,
        },
        axisLine: { show: true, lineStyle: { color: colors.grid } },
        splitLine: { show: true, lineStyle: { color: colors.grid, type: 'dashed' } },
        name: AXIS_LABELS.population,
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      yAxis: {
        type: 'category',
        data: ageLabels,
        axisTick: { show: false },
        axisLine: { show: true, lineStyle: { color: colors.centerLine } },
        axisLabel: {
          fontSize: 10,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.textSecondary,
          interval: yAxisInterval,
        },
        splitLine: { 
          show: true, 
          lineStyle: { 
            color: colors.grid, 
            type: 'dashed',
            opacity: 0.5,
          } 
        },
        name: AXIS_LABELS.age,
        nameLocation: 'middle',
        nameRotate: 90,
        nameGap: 40,
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      series: [
        {
          name: LEGEND_LABELS.male,
          type: 'bar',
          stack: 'male',
          data: maleBaseData,
          itemStyle: { color: colors.male },
          barWidth: dynamicBarHeight,
          barGap: '-100%',
          emphasis: { itemStyle: { opacity: 0.8 } },
          label: {
            show: showBarLabels,
            position: 'insideRight',
            formatter: (params: { dataIndex: number }) => {
              const value = Math.abs(chartData[params.dataIndex].male);
              return formatPopulation(value);
            },
            fontSize: 10,
            fontFamily: "'DM Sans', sans-serif",
            color: '#fff',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowBlur: 2,
          },
        },
        {
          name: LEGEND_LABELS.maleSurplus,
          type: 'bar',
          stack: 'male',
          data: maleSurplusData,
          itemStyle: { color: colors.maleSurplus },
          barWidth: dynamicBarHeight,
          emphasis: { itemStyle: { opacity: 0.8 } },
        },
        {
          name: LEGEND_LABELS.female,
          type: 'bar',
          stack: 'female',
          data: femaleBaseData,
          itemStyle: { color: colors.female },
          barWidth: dynamicBarHeight,
          barGap: '-100%',
          emphasis: { itemStyle: { opacity: 0.8 } },
          label: {
            show: showBarLabels,
            position: 'insideLeft',
            formatter: (params: { dataIndex: number }) => {
              const value = chartData[params.dataIndex].female;
              return formatPopulation(value);
            },
            fontSize: 10,
            fontFamily: "'DM Sans', sans-serif",
            color: '#fff',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowBlur: 2,
          },
        },
        {
          name: LEGEND_LABELS.femaleSurplus,
          type: 'bar',
          stack: 'female',
          data: femaleSurplusData,
          itemStyle: { color: colors.femaleSurplus },
          barWidth: dynamicBarHeight,
          emphasis: { itemStyle: { opacity: 0.8 } },
          // Добавляем медианную линию к последней серии
          ...(showMedianLine && medianAgeIndex >= 0 ? {
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: {
                color: colors.medianLine,
                width: 2,
                type: 'dashed',
              },
              label: {
                show: true,
                formatter: `${t.common.median}: ${medianAge}`,
                position: 'insideStartTop',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                color: colors.medianLine,
                backgroundColor: colors.background,
                padding: [2, 6],
                borderRadius: 3,
              },
              data: [
                {
                  yAxis: chartData[medianAgeIndex]?.age,
                },
              ],
            },
          } : {}),
        },
      ],
      graphic: [
        // Центральная линия
        {
          type: 'line',
          z: 100,
          shape: {
            x1: '50%',
            y1: CHART_CONFIG.padding.top + 80,
            x2: '50%',
            y2: chartHeight - CHART_CONFIG.padding.bottom,
          },
          style: {
            stroke: colors.centerLine,
            lineWidth: 1,
          },
        },
      ],
    };
  }, [chartData, metadata, chartHeight, colors, effectiveMaxScale, yAxisInterval, effectiveTitle, dynamicBarHeight, xAxisSplitCount, showBarLabels, showAsPercentage, toPercent, showMedianLine, medianAgeIndex, medianAge, groupCount, LEGEND_LABELS, AXIS_LABELS, t]);

  // Конфигурация для режима "combined" (суммарно)
  const combinedOption: EChartsOption = useMemo(() => {
    const ageLabels = data.ageGroups.map((group) => group.age);
    const rawTotalData = data.ageGroups.map((group) => group.male + group.female);
    const maxTotal = Math.max(...rawTotalData);
    
    // Конвертируем в проценты если нужно
    const totalData = showAsPercentage 
      ? rawTotalData.map(val => toPercent(val))
      : rawTotalData;
    
    // Для combined режима используем двойной масштаб (male + female)
    const rawCombinedMaxScale = maxScale ? maxScale * 2 : Math.ceil(maxTotal * 1.1 / 100000) * 100000;
    const combinedMaxScale = showAsPercentage 
      ? Math.ceil(toPercent(rawCombinedMaxScale) * 10) / 10
      : rawCombinedMaxScale;

    return {
      backgroundColor: colors.background,
      title: {
        text: effectiveTitle,
        subtext: metadata.subtitle || '',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 28,
          fontWeight: 600,
          fontFamily: "'Playfair Display', Georgia, serif",
          color: colors.text,
        },
        subtextStyle: {
          fontSize: 18,
          fontWeight: 500,
          color: colors.textSecondary,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { 
          type: 'line',
          lineStyle: {
            color: colors.centerLine,
            type: 'dashed',
          },
        },
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text },
        formatter: (params: unknown) => {
          const items = params as Array<{
            axisValue: string;
            value: number;
            dataIndex: number;
          }>;
          
          if (!Array.isArray(items) || items.length === 0) return '';
          
          const item = items[0];
          const age = item.axisValue;
          const ageGroup = data.ageGroups[item.dataIndex];
          const rawTotal = ageGroup.male + ageGroup.female;
          
          const formatVal = (val: number) => showAsPercentage 
            ? `${toPercent(val).toFixed(2)}%`
            : formatPopulation(val);
          
          return `
            <div style="font-family: 'DM Sans', sans-serif; padding: 4px 0; color: ${colors.text};">
              <div style="font-weight: 600; margin-bottom: 8px;">${AXIS_LABELS.age}: ${age}</div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${colors.total}; border-radius: 2px;"></span>
                <span>${t.common.total}: ${formatVal(rawTotal)}</span>
              </div>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${colors.grid}; font-size: 0.875em; color: ${colors.textSecondary};">
                <div>${LEGEND_LABELS.male}: ${formatVal(ageGroup.male)}</div>
                <div>${LEGEND_LABELS.female}: ${formatVal(ageGroup.female)}</div>
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: [t.common.total],
        top: CHART_CONFIG.padding.top + 45,
        left: '16%',
        orient: 'vertical',
        itemGap: 6,
        itemWidth: 14,
        itemHeight: 10,
        selectedMode: false,
        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderRadius: 4,
        padding: [8, 12],
        textStyle: {
          fontSize: 11,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      grid: {
        left: '15%',
        right: '15%',
        top: CHART_CONFIG.padding.top + 40,
        bottom: CHART_CONFIG.padding.bottom,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: combinedMaxScale,
        splitNumber: xAxisSplitCount,
        axisLabel: {
          formatter: (value: number) => showAsPercentage 
            ? `${value.toFixed(1)}%`
            : formatPopulation(value),
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          fontSize: 11,
          color: colors.textSecondary,
        },
        axisLine: { show: true, lineStyle: { color: colors.grid } },
        splitLine: { show: true, lineStyle: { color: colors.grid, type: 'dashed' } },
        name: AXIS_LABELS.population,
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      yAxis: {
        type: 'category',
        data: ageLabels,
        axisTick: { show: false },
        axisLine: { show: true, lineStyle: { color: colors.grid } },
        axisLabel: {
          fontSize: 10,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.textSecondary,
          interval: yAxisInterval,
        },
        splitLine: { 
          show: true, 
          lineStyle: { 
            color: colors.grid, 
            type: 'dashed',
            opacity: 0.5,
          } 
        },
        name: AXIS_LABELS.age,
        nameLocation: 'middle',
        nameRotate: 90,
        nameGap: 40,
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      series: [
        {
          name: 'Total',
          type: 'bar',
          data: totalData,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: colors.totalGradientStart },
                { offset: 1, color: colors.totalGradientEnd },
              ],
            },
            borderRadius: [0, 4, 4, 0],
          },
          barWidth: dynamicBarHeight,
          emphasis: {
            itemStyle: {
              opacity: 0.9,
            },
          },
          label: {
            show: showBarLabels,
            position: 'insideRight',
            formatter: (params: unknown) => {
              const p = params as { value?: number };
              const val = p.value ?? 0;
              return showAsPercentage ? `${val.toFixed(2)}%` : formatPopulation(val);
            },
            fontSize: 10,
            fontFamily: "'DM Sans', sans-serif",
            color: '#fff',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowBlur: 2,
          },
          // Добавляем медианную линию
          ...(showMedianLine && medianAgeIndex >= 0 ? {
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: {
                color: colors.medianLine,
                width: 2,
                type: 'dashed',
              },
              label: {
                show: true,
                formatter: `${t.common.median}: ${medianAge}`,
                position: 'insideStartTop',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                color: colors.medianLine,
                backgroundColor: colors.background,
                padding: [2, 6],
                borderRadius: 3,
              },
              data: [
                {
                  yAxis: data.ageGroups[medianAgeIndex]?.age,
                },
              ],
            },
          } : {}),
        },
      ],
    };
  }, [data, metadata, colors, maxScale, yAxisInterval, effectiveTitle, dynamicBarHeight, xAxisSplitCount, showBarLabels, showAsPercentage, toPercent, showMedianLine, medianAgeIndex, medianAge, AXIS_LABELS, LEGEND_LABELS, t]);

  const option = viewMode === 'split' ? splitOption : combinedOption;
  const sourceInfo = metadata.source || data.source;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: chartHeight, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true}
      />
      <div className={styles.footer}>
        {showTotal && (
          <div className={styles.totals}>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>{t.common.total}:</span>
              <span className={styles.totalValue}>{formatPopulation(totals.total)}</span>
            </div>
            {viewMode === 'split' && (
              <>
                <div className={styles.totalItem}>
                  <span className={styles.totalDot} style={{ background: colors.male }} />
                  <span className={styles.totalLabel}>{t.common.males}:</span>
                  <span className={styles.totalValue}>{formatPopulation(totals.male)}</span>
                </div>
                <div className={styles.totalItem}>
                  <span className={styles.totalDot} style={{ background: colors.female }} />
                  <span className={styles.totalLabel}>{t.common.females}:</span>
                  <span className={styles.totalValue}>{formatPopulation(totals.female)}</span>
                </div>
              </>
            )}
          </div>
        )}
        {sourceInfo && (
          <div className={styles.source}>
            {sourceInfo}
          </div>
        )}
      </div>
    </div>
  );
});
