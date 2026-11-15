import React, { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import * as echarts from 'echarts';
import {
  SOURCES,
  SOURCE_METADATA,
  getValueForSource,
  formatHotspotValue,
} from './dataHelpers.js';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Ember ramp: cool ember to intense fire, matching the map palette.
const HEAT_COLORS = [
  '#3a2a1c', '#7a4322', '#b65a25', '#f0872e', '#ffc766',
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
        fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
      },
      tooltip: {
        position: 'top',
        backgroundColor: '#0d1519',
        borderColor: '#3a4a50',
        borderWidth: 1,
        textStyle: { color: '#e6ecee', fontSize: 13 },
        formatter: (params) => {
          const [mIdx, yIdx, val, monthKey] = params.data;
          const monthName = MONTH_NAMES[mIdx];
          const year = years[yIdx];
          const formattedVal = formatHotspotValue(val, source);
          const isHighlighted = monthKey === highlightedMonth;

          let statusLine = '';
          if (val === null) {
            statusLine = `<div style="color: #9aa9ad; font-style: italic;">No observation / sensor unavailable</div>`;
          } else if (val === 0) {
            statusLine = `<div style="color: #8fb0c4;">True zero (no fire detected)</div>`;
          }

          return `
            <div style="font-weight: 600; margin-bottom: 4px;">${monthName} ${year} (${monthKey})</div>
            <div style="color: #ffb45e; font-size: 14px; font-weight: 700;">
              ${formattedVal} <span style="font-size: 11px; font-weight: normal; color: #9aa9ad;">${activeMeta.unit}</span>
            </div>
            ${statusLine}
            ${isHighlighted ? '<div style="color: #ffb45e; margin-top: 4px; font-weight: 600;">Flagged unusual period</div>' : ''}
          `;
        },
      },
      grid: {
        top: 40,
        bottom: 60,
        left: 70,
        right: 20,
      },
      xAxis: {
        type: 'category',
        data: MONTH_NAMES,
        splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)', 'transparent'] } },
        axisLabel: { color: '#9aa9ad', fontSize: 12 },
        axisLine: { lineStyle: { color: '#2b393e' } },
      },
      yAxis: {
        type: 'category',
        data: years.map(String),
        splitArea: { show: true },
        axisLabel: { color: '#9aa9ad', fontSize: 12 },
        axisLine: { lineStyle: { color: '#2b393e' } },
      },
      visualMap: {
        min: 0,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 5,
        inRange: {
          color: HEAT_COLORS,
        },
        textStyle: { color: '#9aa9ad', fontSize: 11 },
        formatter: (val) => Math.round(val).toLocaleString(),
      },
      series: [
        {
          name: activeMeta.label,
          type: 'heatmap',
          data: matrixData.map(([mIdx, yIdx, val, monthKey]) => {
            const isHighlighted = monthKey === highlightedMonth;
            if (val === null) {
              return {
                value: [mIdx, yIdx, '-'],
                itemStyle: {
                  color: '#0d1519',
                  borderColor: isHighlighted ? '#ed9b45' : '#2b393e',
                  borderWidth: isHighlighted ? 2 : 1,
                  borderType: 'dashed',
                },
              };
            }
            if (isHighlighted) {
              return {
                value: [mIdx, yIdx, val, monthKey],
                itemStyle: {
                  borderColor: '#ffb45e',
                  borderWidth: 3,
                },
              };
            }
            return [mIdx, yIdx, val, monthKey];
          }),
          label: { show: false },
          itemStyle: {
            borderColor: '#121b1f',
            borderWidth: 1,
          },
          emphasis: {
            itemStyle: {
              borderColor: '#ffb45e',
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
        role="region"
        aria-label={`Interactive burning calendar heatmap showing ${activeMeta.label}`}
        style={{
          width: '100%',
          height: `${Math.max(260, years.length * 22 + 120)}px`,
          minHeight: '260px',
        }}
      />

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
