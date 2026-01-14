/**
 * Кастомная сборка ECharts с tree-shaking
 * Импортируем только необходимые модули для уменьшения размера бандла
 */

// Ядро ECharts
import * as echarts from 'echarts/core';

// Компоненты (только то что используем)
import { BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  GraphicComponent,
} from 'echarts/components';

// Рендерер SVG (легче чем Canvas)
import { SVGRenderer } from 'echarts/renderers';

// Регистрируем компоненты
echarts.use([
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  GraphicComponent,
  SVGRenderer,
]);

export default echarts;
export { echarts };

