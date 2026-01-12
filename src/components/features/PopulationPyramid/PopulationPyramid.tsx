import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import type { PopulationData } from '../../../types';
import { transformToChartData, extractChartMetadata } from '../../../services/dataTransformer';
import { CHART_COLORS, LEGEND_LABELS, AXIS_LABELS, CHART_CONFIG } from '../../../constants';
import { formatPopulation } from '../../../utils';
import styles from './PopulationPyramid.module.css';

interface PopulationPyramidProps {
  /** Данные о населении */
  data: PopulationData;
  /** Дополнительный CSS класс */
  className?: string;
}

/**
 * Компонент половозрастной пирамиды населения
 * Использует ECharts для отображения горизонтальной гистограммы
 */
export function PopulationPyramid({ data, className }: PopulationPyramidProps) {
  const chartData = useMemo(() => transformToChartData(data), [data]);
  const metadata = useMemo(() => extractChartMetadata(data), [data]);

  // Высота диаграммы зависит от количества возрастных групп
  const chartHeight = Math.max(
    CHART_CONFIG.minHeight,
    data.ageGroups.length * CHART_CONFIG.heightPerAge + 
    CHART_CONFIG.padding.top + 
    CHART_CONFIG.padding.bottom
  );

  const option: EChartsOption = useMemo(() => {
    const ageLabels = chartData.map((item) => item.age);
    
    // Данные для стековых баров
    const maleBaseData = chartData.map((item) => item.maleBase);
    const maleSurplusData = chartData.map((item) => item.maleSurplus);
    const femaleBaseData = chartData.map((item) => item.femaleBase);
    const femaleSurplusData = chartData.map((item) => item.femaleSurplus);

    return {
      title: {
        text: metadata.title,
        subtext: metadata.subtitle || '',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 28,
          fontWeight: 600,
          fontFamily: "'Playfair Display', Georgia, serif",
          color: CHART_COLORS.text,
        },
        subtextStyle: {
          fontSize: 14,
          color: CHART_COLORS.textSecondary,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: unknown) => {
          const items = params as Array<{
            axisValue: string;
            seriesName: string;
            value: number;
            color: string;
          }>;
          
          if (!Array.isArray(items) || items.length === 0) return '';
          
          const age = items[0].axisValue;
          let maleTotal = 0;
          let femaleTotal = 0;
          
          items.forEach((item) => {
            const value = Math.abs(item.value);
            if (item.seriesName.includes('Male')) {
              maleTotal += value;
            } else {
              femaleTotal += value;
            }
          });
          
          return `
            <div style="font-family: 'DM Sans', sans-serif; padding: 4px 0;">
              <div style="font-weight: 600; margin-bottom: 8px;">Age: ${age}</div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${CHART_COLORS.male}; border-radius: 2px;"></span>
                <span>Males: ${formatPopulation(maleTotal)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${CHART_COLORS.female}; border-radius: 2px;"></span>
                <span>Females: ${formatPopulation(femaleTotal)}</span>
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
        top: 55,
        left: 20,
        orient: 'vertical',
        itemGap: 8,
        itemWidth: 16,
        itemHeight: 12,
        textStyle: {
          fontSize: 12,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: CHART_COLORS.text,
        },
      },
      grid: {
        left: CHART_CONFIG.padding.left,
        right: CHART_CONFIG.padding.right,
        top: CHART_CONFIG.padding.top + 80,
        bottom: CHART_CONFIG.padding.bottom,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        min: -metadata.maxValue,
        max: metadata.maxValue,
        axisLabel: {
          formatter: (value: number) => formatPopulation(Math.abs(value)),
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          fontSize: 11,
          color: CHART_COLORS.textSecondary,
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: CHART_COLORS.grid,
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: CHART_COLORS.grid,
            type: 'dashed',
          },
        },
        name: AXIS_LABELS.population,
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: CHART_COLORS.text,
        },
      },
      yAxis: {
        type: 'category',
        data: ageLabels,
        axisTick: {
          show: false,
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: CHART_COLORS.centerLine,
          },
        },
        axisLabel: {
          fontSize: 10,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: CHART_COLORS.textSecondary,
        },
        name: AXIS_LABELS.age,
        nameLocation: 'end',
        nameGap: 10,
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: CHART_COLORS.text,
        },
      },
      series: [
        // Мужчины - базовая часть (слева)
        {
          name: LEGEND_LABELS.male,
          type: 'bar',
          stack: 'male',
          data: maleBaseData,
          itemStyle: {
            color: CHART_COLORS.male,
          },
          barWidth: CHART_CONFIG.barHeight,
          emphasis: {
            itemStyle: {
              opacity: 0.8,
            },
          },
        },
        // Мужчины - избыток
        {
          name: LEGEND_LABELS.maleSurplus,
          type: 'bar',
          stack: 'male',
          data: maleSurplusData,
          itemStyle: {
            color: CHART_COLORS.maleSurplus,
          },
          barWidth: CHART_CONFIG.barHeight,
          emphasis: {
            itemStyle: {
              opacity: 0.8,
            },
          },
        },
        // Женщины - базовая часть (справа)
        {
          name: LEGEND_LABELS.female,
          type: 'bar',
          stack: 'female',
          data: femaleBaseData,
          itemStyle: {
            color: CHART_COLORS.female,
          },
          barWidth: CHART_CONFIG.barHeight,
          emphasis: {
            itemStyle: {
              opacity: 0.8,
            },
          },
        },
        // Женщины - избыток
        {
          name: LEGEND_LABELS.femaleSurplus,
          type: 'bar',
          stack: 'female',
          data: femaleSurplusData,
          itemStyle: {
            color: CHART_COLORS.femaleSurplus,
          },
          barWidth: CHART_CONFIG.barHeight,
          emphasis: {
            itemStyle: {
              opacity: 0.8,
            },
          },
        },
      ],
      // Центральная линия
      graphic: [
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
            stroke: CHART_COLORS.centerLine,
            lineWidth: 1,
          },
        },
      ],
    };
  }, [chartData, metadata, chartHeight]);

  // Информация об источнике
  const sourceInfo = metadata.source || data.source;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <ReactECharts
        option={option}
        style={{ height: chartHeight, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true}
      />
      {sourceInfo && (
        <div className={styles.source}>
          Source: {sourceInfo}
        </div>
      )}
    </div>
  );
}

