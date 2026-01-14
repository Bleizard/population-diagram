import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nContext } from '../i18n';
import { useLanguage } from '../hooks';
import { EmbedChart } from './EmbedChart';
import type { PopulationData, TimeSeriesPopulationData, ChartSettings } from '../types';
import type { Theme } from '../hooks';
import '../index.css';

// Компактные форматы данных
type CompactAgeGroup = [number, number, number];

interface CompactPopulationData {
  title: string;
  date?: string;
  source?: string;
  ageGroups: CompactAgeGroup[];
}

interface CompactTimeSeriesData {
  years: number[];
  dataByYear: Record<number, CompactAgeGroup[]>;
}

interface CompactEmbedData {
  data: CompactPopulationData;
  timeSeriesData?: CompactTimeSeriesData;
  settings: ChartSettings;
  theme?: Theme;
}

// Интерфейс для данных после расширения
interface EmbedData {
  data: PopulationData;
  timeSeriesData?: TimeSeriesPopulationData;
  settings: ChartSettings;
  theme?: Theme;
}

/**
 * Восстанавливает PopulationData из компактного формата
 */
function expandPopulationData(compact: CompactPopulationData): PopulationData {
  return {
    title: compact.title,
    date: compact.date,
    source: compact.source,
    ageGroups: compact.ageGroups.map(([ageNumeric, male, female]) => {
      // Восстанавливаем age из ageNumeric
      // Для точности нужно было бы сохранять age отдельно, но для экономии места используем ageNumeric
      const age = ageNumeric === 0 ? '0' : 
                  ageNumeric < 100 ? String(ageNumeric) : 
                  '100+';
      return {
        age,
        ageNumeric,
        male,
        female,
      };
    }),
  };
}

/**
 * Восстанавливает TimeSeriesPopulationData из компактного формата
 */
function expandTimeSeriesData(compact: CompactTimeSeriesData, title: string): TimeSeriesPopulationData {
  const expanded: TimeSeriesPopulationData = {
    title,
    years: compact.years,
    dataByYear: {},
  };
  
  for (const year of compact.years) {
    const yearData = compact.dataByYear[year];
    if (yearData) {
      expanded.dataByYear[year] = yearData.map(([ageNumeric, male, female]) => {
        const age = ageNumeric === 0 ? '0' : 
                    ageNumeric < 100 ? String(ageNumeric) : 
                    '100+';
        return {
          age,
          ageNumeric,
          male,
          female,
        };
      });
    }
  }
  
  return expanded;
}

function EmbedApp() {
  const { language, t, setLanguage } = useLanguage();
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    let data: EmbedData | undefined;

    // Сначала пытаемся получить данные из window.embedChartData (для обратной совместимости)
    const windowData = (window as any).embedChartData as CompactEmbedData | EmbedData | undefined;
    if (windowData) {
      // Проверяем, компактный ли это формат (есть ли ageGroups как массив массивов)
      if (windowData.data && Array.isArray(windowData.data.ageGroups) && 
          windowData.data.ageGroups.length > 0 && 
          Array.isArray(windowData.data.ageGroups[0])) {
        // Это компактный формат, расширяем
        const compactData = windowData as CompactEmbedData;
        data = {
          data: expandPopulationData(compactData.data),
          timeSeriesData: compactData.timeSeriesData ? expandTimeSeriesData(compactData.timeSeriesData, compactData.data.title) : undefined,
          settings: compactData.settings,
          theme: compactData.theme,
        };
      } else {
        // Старый формат (полный), используем как есть
        data = windowData as EmbedData;
      }
    }

    // Если данных нет, слушаем postMessage от родительского окна
    if (!data) {
      const handleMessage = (event: MessageEvent) => {
        // Проверяем origin для безопасности (в production можно добавить проверку)
        if (event.data && event.data.type === 'POPULATION_PYRAMID_DATA') {
          const compactData = event.data.data as CompactEmbedData;
          // Расширяем компактные данные обратно в полный формат
          data = {
            data: expandPopulationData(compactData.data),
            timeSeriesData: compactData.timeSeriesData ? expandTimeSeriesData(compactData.timeSeriesData, compactData.data.title) : undefined,
            settings: compactData.settings,
            theme: compactData.theme,
          };
          setEmbedData(data);
          // Устанавливаем начальный год из временного ряда, если есть
          if (data.timeSeriesData && data.timeSeriesData.years.length > 0) {
            setSelectedYear(data.timeSeriesData.years[data.timeSeriesData.years.length - 1]);
          }
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Также пытаемся получить из URL параметра (для обратной совместимости, но с ограничением размера)
      const urlParams = new URLSearchParams(window.location.search);
      const dataParam = urlParams.get('data');
      
      if (dataParam && dataParam.length < 10000) { // Только для небольших данных
        try {
          const decoded = decodeURIComponent(dataParam);
          const compactData = JSON.parse(decoded) as CompactEmbedData;
          // Расширяем компактные данные
          data = {
            data: expandPopulationData(compactData.data),
            timeSeriesData: compactData.timeSeriesData ? expandTimeSeriesData(compactData.timeSeriesData, compactData.data.title) : undefined,
            settings: compactData.settings,
            theme: compactData.theme,
          };
        } catch (err) {
          console.error('Failed to parse embed data from URL:', err);
        }
      }

      // Если данные получены из URL, устанавливаем их
      if (data) {
        setEmbedData(data);
        if (data.timeSeriesData && data.timeSeriesData.years.length > 0) {
          setSelectedYear(data.timeSeriesData.years[data.timeSeriesData.years.length - 1]);
        }
        window.removeEventListener('message', handleMessage);
      } else {
        // Если данных нет, ждём сообщение от родительского окна
        // Таймаут для показа сообщения об ошибке, если данные не придут
        const timeout = setTimeout(() => {
          if (!data) {
            console.error('Embed data not found. Waiting for postMessage from parent window.');
          }
        }, 5000);

        return () => {
          window.removeEventListener('message', handleMessage);
          clearTimeout(timeout);
        };
      }
    } else {
      // Данные уже есть в window.embedChartData
      setEmbedData(data);
      if (data.timeSeriesData && data.timeSeriesData.years.length > 0) {
        setSelectedYear(data.timeSeriesData.years[data.timeSeriesData.years.length - 1]);
      }
    }
  }, []);

  if (!embedData) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: 'var(--color-text-secondary)',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <p>Chart data not provided.</p>
        <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>
          Please set <code>window.embedChartData</code> before loading the embed script.
        </p>
      </div>
    );
  }

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  return (
    <I18nContext.Provider value={{ language, t, setLanguage }}>
      <EmbedChart
        data={embedData.data}
        timeSeriesData={embedData.timeSeriesData}
        selectedYear={selectedYear}
        theme={embedData.theme || 'light'}
        viewMode={embedData.settings.viewMode}
        maxScale={embedData.settings.scaleCustomValue}
        yAxisInterval={embedData.settings.yAxisLabelMode === 'all' ? 0 : 'auto'}
        customTitle={embedData.settings.customTitle}
        xAxisSplitCount={embedData.settings.xAxisSplitCount}
        showBarLabels={embedData.settings.showBarLabels}
        colorProfile={embedData.settings.colorProfile}
        showMedianLine={embedData.settings.showMedianLine}
        showAsPercentage={embedData.settings.showAsPercentage}
        onYearChange={handleYearChange}
      />
    </I18nContext.Provider>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <EmbedApp />
    </StrictMode>
  );
}

