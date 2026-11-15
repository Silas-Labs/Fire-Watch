import { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import * as echarts from 'echarts';
import {
  SOURCES,
  SOURCE_METADATA,
  getValueForSource,
  formatHotspotValue,
} from './dataHelpers.js';
import { FIRE_RAMP } from '../theme/colors.js';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Calendar Heatmap Component (Domain D - Peter)
 * 
 * Props:
 * - series: Array of { month: 'YYYY-MM', harmonized, modis_hotspots, viirs_hotspots, ... }
 * - source: 'harmonized' | 'modis' | 'viirs'
 * - onSourceChange: (newSource) => void
 * - highlightedMonth: 'YYYY-MM' | null (for anomaly sync)
 * - onCellClick: (monthStr, value) => void
 * - onChartReady: (echartsInstance) => void
 */
export const CalendarHeatmap = forwardRef(function CalendarHeatmap(
  {
    series = [],
    source = SOURCES.HARMONIZED,
    highlightedMonth = null,
    onCellClick,
    onChartReady,
  },
  ref
) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [showTable, setShowTable] = useState(false);

  // Expose imperative methods for export
  useImperativeHandle(ref, () => ({
    getChartInstance: () => chartInstanceRef.current,
    hasData: () => hasData,
    getDataUrl: (options = {}) => {
      if (!chartInstanceRef.current) return null;
      return chartInstanceRef.current.getDataURL({
        type: 'png',
        pixelRatio: 2, // High-res presentation quality
        backgroundColor: '#121b1f',
        excludeComponents: ['toolbox'],
        ...options,
      });
    },
  }));

  const activeMeta = SOURCE_METADATA[source] || SOURCE_METADATA[SOURCES.HARMONIZED];

  // Extract years and build matrix
  const { years, matrixData, maxVal, hasData } = useMemo(() => {
    if (!series || series.length === 0) {
      return { years: [], matrixData: [], maxVal: 0, hasData: false };
    }

    const yearSet = new Set();
    const mapByYearMonth = new Map();
    let max = 0;
    let validCount = 0;

    for (const item of series) {
      if (!item || !item.month) continue;
      const [yStr] = item.month.split('-');
      const y = parseInt(yStr, 10);
      yearSet.add(y);

      const val = getValueForSource(item, source);
      mapByYearMonth.set(item.month, { val, item });

      if (val !== null) {
        validCount++;
        if (val > max) max = val;
      }
    }

    const sortedYears = Array.from(yearSet).sort((a, b) => a - b);
    const matrix = [];

    sortedYears.forEach((yr, yIdx) => {
      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        const monthKey = `${yr}-${mStr}`;
        const record = mapByYearMonth.get(monthKey);
        const val = record ? record.val : null;

        // ECharts heatmap item: [x (month 0-11), y (yearIdx), val, monthKey]
        matrix.push([m - 1, yIdx, val, monthKey]);
      }
    });

    return {
      years: sortedYears,
      matrixData: matrix,
      maxVal: max > 0 ? max : 10,
      hasData: validCount > 0,
    };
  }, [series, source]);

  // Initialize and update ECharts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartContainerRef.current, null, {
        renderer: 'canvas',
      });
      if (onChartReady) {
        onChartReady(chartInstanceRef.current);
      }
    }

    const chart = chartInstanceRef.current;

    // Click handler
    const handleClick = (params) => {
      if (params.data && onCellClick) {
        const monthKey = params.data[3];
        const val = params.data[2];
        onCellClick(monthKey, val);
      }
    };
    chart.off('click');
    chart.on('click', handleClick);

    if (years.length === 0) {
      chart.clear();
      return;
    }

    const option = {
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      tooltip: {
        position: 'top',
        backgroundColor: '#ffffff',
        borderColor: '#ddd6cc',
        borderWidth: 1,
        textStyle: { color: '#1f2320', fontSize: 13 },
        formatter: (params) => {
          const [mIdx, yIdx, val, monthKey] = params.data;
          const monthName = MONTH_NAMES[mIdx];
          const year = years[yIdx];
          const formattedVal = formatHotspotValue(val, source);
          const isHighlighted = monthKey === highlightedMonth;

          let statusLine = '';
          if (val === null) {
            statusLine = `<div style="color: #5f6864; font-style: italic;">No observation / sensor unavailable</div>`;
          } else if (val === 0) {
            statusLine = `<div style="color: #3b6f8f;">True zero (no fire detected)</div>`;
          }

          return `
            <div style="font-weight: 600; margin-bottom: 4px;">${monthName} ${year} (${monthKey})</div>
            <div style="color: #b84a1f; font-size: 14px; font-weight: 700;">
              ${formattedVal} <span style="font-size: 11px; font-weight: normal; color: #5f6864;">${activeMeta.unit}</span>
            </div>
            ${statusLine}
            ${isHighlighted ? '<div style="color: #b84a1f; margin-top: 4px; font-weight: 600;">Flagged unusual period</div>' : ''}
          `;
        },
      },
      grid: {
        top: 40,
        bottom: 86,
        left: 68,
        right: 20,
      },
      xAxis: {
        type: 'category',
        data: MONTH_NAMES,
        splitArea: { show: true, areaStyle: { color: ['rgba(31,35,32,0.02)', 'transparent'] } },
        axisLabel: { color: '#5f6864', fontSize: 12 },
        axisLine: { lineStyle: { color: '#c7bfb2' } },
      },
      yAxis: {
        type: 'category',
        data: years.map(String),
        splitArea: { show: false },
        axisLabel: { color: '#5f6864', fontSize: 12 },
        axisLine: { lineStyle: { color: '#c7bfb2' } },
      },
      visualMap: {
        min: 0,
        max: maxVal,
        dimension: 2,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        inRange: {
          color: FIRE_RAMP,
        },
        textStyle: { color: '#5f6864', fontSize: 11 },
        formatter: (val) => Math.round(val).toLocaleString(),
      },
      series: [
        {
          name: activeMeta.label,
          type: 'heatmap',
          data: matrixData
            .filter(([, , val]) => val !== null)
            .map(([mIdx, yIdx, val, monthKey]) => {
              const isHighlighted = monthKey === highlightedMonth;
              if (isHighlighted) {
                return {
                  value: [mIdx, yIdx, val, monthKey],
                  itemStyle: {
                    borderColor: '#b84a1f',
                    borderWidth: 3,
                  },
                };
              }
              return [mIdx, yIdx, val, monthKey];
            }),
          label: { show: false },
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 1,
          },
          emphasis: {
            itemStyle: {
              borderColor: '#b84a1f',
              borderWidth: 2,
            },
          },
        },
      ],
    };

    chart.setOption(option, true);

    const handleResize = () => chart && chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [years, matrixData, maxVal, activeMeta, highlightedMonth, source, onCellClick, onChartReady]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  // Restore the chart size after returning from the table view.
  useEffect(() => {
    if (!showTable) {
      chartInstanceRef.current?.resize();
    }
  }, [showTable]);

  // Keep the heatmap fitted to the fixed panel as it resizes.
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      chartInstanceRef.current?.resize();
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <div>
          <h2>Burning calendar</h2>
          <p>
            Year by month for the selected area. {activeMeta.description}.
          </p>
        </div>

        <div className="chart-actions">
          <button
            type="button"
            aria-expanded={showTable}
            onClick={() => setShowTable((prev) => !prev)}
            className={`text-button${showTable ? ' is-active' : ''}`}
          >
            {showTable ? 'Hide table' : 'View as table'}
          </button>
        </div>
      </div>

      <div
        ref={chartContainerRef}
        hidden={showTable}
        className="calendar-chart"
        role="region"
        aria-label={`Interactive burning calendar heatmap showing ${activeMeta.label}`}
      />

      {!showTable && (
        <p className="chart-footnote">
          Blank cells mark months without an observation.
        </p>
      )}

      {!hasData && (
        <div className="chart-empty" role="status">
          No observation data available for the current filter.
        </div>
      )}

      {showTable && (
        <div className="chart-table-wrap">
          <table
            className="chart-table"
            aria-label="Burning calendar data table"
          >
            <thead>
              <tr>
                <th>Year</th>
                {MONTH_NAMES.map((m) => (
                  <th key={m}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((yr) => (
                <tr key={yr}>
                  <td>{yr}</td>
                  {MONTH_NAMES.map((m, mIdx) => {
                    const monthKey = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
                    const entry = series.find((s) => s.month === monthKey);
                    const val = entry ? getValueForSource(entry, source) : null;
                    return (
                      <td key={monthKey}>
                        {formatHotspotValue(val, source, { placeholder: '—' })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
export default CalendarHeatmap;
