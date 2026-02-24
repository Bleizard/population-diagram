import type { PopulationData, TimeSeriesPopulationData, ChartSettings } from '../types';
import type { Theme } from '../hooks';

interface EmbedData {
  data: PopulationData;
  timeSeriesData?: TimeSeriesPopulationData;
  settings: ChartSettings;
  theme?: Theme;
}

/**
 * Компактное представление возрастной группы
 * [ageNumeric, male, female] вместо объекта
 */
type CompactAgeGroup = [number, number, number];

/**
 * Компактное представление данных о населении
 */
interface CompactPopulationData {
  title: string;
  date?: string;
  source?: string;
  // Массив [ageNumeric, male, female] вместо объектов
  ageGroups: CompactAgeGroup[];
}

/**
 * Компактное представление временного ряда
 */
interface CompactTimeSeriesData {
  years: number[];
  // Для каждого года - массив [ageNumeric, male, female]
  dataByYear: Record<number, CompactAgeGroup[]>;
}

/**
 * Преобразует PopulationData в компактный формат
 */
function compactPopulationData(data: PopulationData): CompactPopulationData & { hasGenderData?: boolean } {
  const result: CompactPopulationData & { hasGenderData?: boolean } = {
    title: data.title,
    date: data.date,
    source: data.source,
    ageGroups: data.ageGroups.map(g => [g.ageNumeric, g.male, g.female] as CompactAgeGroup),
  };
  if (data.hasGenderData === false) {
    result.hasGenderData = false;
  }
  return result;
}


/**
 * Преобразует TimeSeriesPopulationData в компактный формат
 */
function compactTimeSeriesData(data: TimeSeriesPopulationData): CompactTimeSeriesData {
  const compact: CompactTimeSeriesData = {
    years: data.years,
    dataByYear: {},
  };
  
  for (const year of data.years) {
    const yearData = data.dataByYear[year];
    if (yearData) {
      compact.dataByYear[year] = yearData.map(g => [g.ageNumeric, g.male, g.female] as CompactAgeGroup);
    }
  }
  
  return compact;
}


/**
 * Генерирует embed код для встраивания графика на другие сайты
 */
export function generateEmbedCode(
  data: PopulationData,
  settings: ChartSettings,
  timeSeriesData?: TimeSeriesPopulationData | null,
  theme?: Theme,
  baseUrl: string = 'https://bleizard.github.io/population-diagram'
): string {
  const embedData: EmbedData = {
    data,
    settings,
    theme: theme || 'light',
  };

  if (timeSeriesData) {
    embedData.timeSeriesData = timeSeriesData;
  }

  // Сериализуем данные в JSON
  const jsonData = JSON.stringify(embedData)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\//g, '\\/');

  // Генерируем embed код
  const embedCode = `<!-- Population Pyramid Embed -->
<div id="population-pyramid-embed"></div>
<script>
  (function() {
    // Устанавливаем данные для embed
    window.embedChartData = ${jsonData};
    
    // Создаём iframe
    var iframe = document.createElement('iframe');
    iframe.src = '${baseUrl}/embed.html';
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('allowfullscreen', 'true');
    
    // Вставляем iframe в контейнер
    var container = document.getElementById('population-pyramid-embed');
    if (container) {
      container.appendChild(iframe);
    }
  })();
</script>`;

  return embedCode;
}

/**
 * Генерирует упрощённый embed код (только iframe)
 * Использует postMessage для передачи данных, чтобы избежать ошибки 431 (слишком большой URL)
 */
export function generateSimpleEmbedCode(
  data: PopulationData,
  settings: ChartSettings,
  timeSeriesData?: TimeSeriesPopulationData | null,
  theme?: Theme,
  baseUrl: string = 'https://bleizard.github.io/population-diagram',
  width: string = '100%',
  height: string = '600px'
): string {
  const embedData: EmbedData = {
    data,
    settings,
    theme: theme || 'light',
  };

  if (timeSeriesData) {
    embedData.timeSeriesData = timeSeriesData;
  }

  // Преобразуем данные в компактный формат для уменьшения размера
  const compactEmbedData = {
    data: compactPopulationData(embedData.data),
    timeSeriesData: embedData.timeSeriesData ? compactTimeSeriesData(embedData.timeSeriesData) : undefined,
    settings: embedData.settings,
    theme: embedData.theme || 'light',
  };
  
  // Сериализуем компактные данные в JSON
  const jsonString = JSON.stringify(compactEmbedData);
  
  // Используем base64 для безопасной передачи данных
  // Это избегает проблем с экранированием специальных символов
  const base64Data = btoa(unescape(encodeURIComponent(jsonString)));

  // Генерируем уникальный ID для этого embed
  const embedId = `pop-pyramid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Экранируем baseUrl для вставки в строку (используем одинарные кавычки)
  const escapedBaseUrl = baseUrl.replace(/'/g, "\\'");

  // Генерируем embed код с использованием postMessage
  const embedCode = `<div id="${embedId}"></div>
<script>
  (function() {
    try {
      // Декодируем base64 данные
      var jsonString = decodeURIComponent(escape(atob('${base64Data}')));
      var embedData = JSON.parse(jsonString);
      var iframe = document.createElement('iframe');
      iframe.src = '${escapedBaseUrl}/embed.html';
      iframe.width = '${width}';
      iframe.height = '${height}';
      iframe.frameBorder = '0';
      iframe.allowFullscreen = true;
      iframe.style.border = 'none';
      iframe.style.overflow = 'hidden';
      
      var container = document.getElementById('${embedId}');
      if (container) {
        container.appendChild(iframe);
        
        // Отправляем данные через postMessage после загрузки iframe
        iframe.onload = function() {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'POPULATION_PYRAMID_DATA',
              data: embedData
            }, '${escapedBaseUrl}');
          }
        };
      }
    } catch (e) {
      console.error('Failed to initialize embed:', e);
    }
  })();
</script>`;

  return embedCode;
}

