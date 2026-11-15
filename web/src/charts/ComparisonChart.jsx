import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import {
  SOURCES,
  getValueForSource,
  formatHotspotValue,
} from '../calendar/dataHelpers.js';

/**
 * Sensor Comparison Line Chart (Domain D - Peter)
 * 
 * Plots Raw MODIS, Raw VIIRS, and Harmonized (MODIS-equivalent) time-series.
 * Demonstrates sensor mismatch and how the harmonized series bridges the records.
 * 
 * Props:
 * - series: Array of { month: 'YYYY-MM', harmonized, modis_hotspots, viirs_hotspots, ... }
 */
export function ComparisonChart({ series = [] }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [showTable, setShowTable] = useState(false);

  // Process data for the 3 lines
  const { months, harmonizedData, modisData, viirsData, hasData } = useMemo(() => {
    if (!series || series.length === 0) {
      return {
        months: [],
        harmonizedData: [],
        modisData: [],
        viirsData: [],
        hasData: false,
      };
    }

    const sorted = [...series].sort((a, b) => (a.month < b.month ? -1 : 1));
    const mList = [];
    const harm = [];
    const mod = [];
    const vii = [];
    let validCount = 0;

    for (const item of sorted) {
      if (!item || !item.month) continue;
      mList.push(item.month);

      const hVal = getValueForSource(item, SOURCES.HARMONIZED);
      const mVal = getValueForSource(item, SOURCES.MODIS);
      const vVal = getValueForSource(item, SOURCES.VIIRS);

      // In ECharts, null / '-' represents missing/unconnected data points
      harm.push(hVal !== null ? hVal : '-');
      mod.push(mVal !== null ? mVal : '-');
      vii.push(vVal !== null ? vVal : '-');

      if (hVal !== null || mVal !== null || vVal !== null) {
        validCount++;
      }
    }

    return {
      months: mList,
      harmonizedData: harm,
      modisData: mod,
      viirsData: vii,
      hasData: validCount > 0,
    };
  }, [series]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartContainerRef.current, null, {
        renderer: 'canvas',
      });
    }

    const chart = chartInstanceRef.current;

    if (months.length === 0) {
      chart.clear();
      return;
    }

    const option = {
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0d1519',
        borderColor: '#3a4a50',
        borderWidth: 1,
        textStyle: { color: '#e6ecee', fontSize: 13 },
        axisPointer: {
          type: 'cross',
          lineStyle: { color: '#ed9b45', type: 'dashed' },
        },
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const monthStr = params[0].axisValue;
          let html = `<div style="font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid #2b393e; padding-bottom: 4px;">Month: ${monthStr}</div>`;
          
          params.forEach((p) => {
            const rawVal = p.value === '-' ? null : p.value;
            const displayVal = rawVal !== null ? Number(rawVal).toLocaleString(undefined, { maximumFractionDigits: 1 }) : 'No data / Unobserved';
            html += `
              <div style="display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin: 3px 0;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${p.color};"></span>
                  <span style="color: #9aa9ad;">${p.seriesName}:</span>
                </span>
                <strong style="color: #e6ecee;">${displayVal}</strong>
              </div>
            `;
          });
          return html;
        },
      },
      legend: {
        data: ['Harmonized (MODIS-equiv)', 'Raw MODIS', 'Raw VIIRS'],
        top: 8,
        textStyle: { color: '#9aa9ad', fontSize: 12 },
        selectedMode: true,
      },
      grid: {
        top: 50,
        bottom: 60,
        left: 65,
        right: 30,
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 10,
          height: 20,
          borderColor: '#2b393e',
          textStyle: { color: '#9aa9ad' },
        },
      ],
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#2b393e' } },
        axisLabel: {
          color: '#9aa9ad',
          fontSize: 11,
          formatter: (val) => {
            // If January, highlight year
            if (val && val.endsWith('-01')) return val.slice(0, 4);
            return val ? val.slice(5) : '';
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Hotspots',
        nameTextStyle: { color: '#9aa9ad', fontSize: 11 },
        axisLine: { lineStyle: { color: '#2b393e' } },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#9aa9ad', fontSize: 11 },
      },
      series: [
        {
          name: 'Harmonized (MODIS-equiv)',
          type: 'line',
          data: harmonizedData,
          connectNulls: false, // PRESERVE GAPS FOR MISSING OBSERVATIONS
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#ed9b45',
            width: 2.5,
          },
          itemStyle: { color: '#ed9b45' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(237, 155, 69, 0.18)' },
              { offset: 1, color: 'rgba(237, 155, 69, 0.0)' },
            ]),
          },
        },
        {
          name: 'Raw MODIS',
          type: 'line',
          data: modisData,
          connectNulls: false,
          smooth: false,
          symbol: 'triangle',
          symbolSize: 5,
          lineStyle: {
            color: '#8fb0c4',
            width: 1.8,
            type: 'dashed',
          },
          itemStyle: { color: '#8fb0c4' },
        },
        {
          name: 'Raw VIIRS',
          type: 'line',
          data: viirsData,
          connectNulls: false, // Critical: preserves pre-2012 gap
          smooth: false,
          symbol: 'diamond',
          symbolSize: 5,
          lineStyle: {
            color: '#c9a88b',
            width: 1.8,
            type: 'dotted',
          },
          itemStyle: { color: '#c9a88b' },
        },
      ],
    };

    chart.setOption(option, true);

    const handleResize = () => chart && chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [months, harmonizedData, modisData, viirsData]);

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
          <h2>Sensor comparison</h2>
          <p>
            Raw MODIS and raw VIIRS against the harmonized continuity series.
            Gaps mark months without a valid observation.
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
        aria-label="Comparison line chart of raw MODIS, raw VIIRS, and harmonized series over time"
        style={{ width: '100%', height: '320px', minHeight: '300px' }}
      />

      {!hasData && (
        <div className="chart-empty" role="status">
          No observation data available in the selected range to compare
          sensors.
        </div>
      )}

      {showTable && (
        <div className="chart-table-wrap">
          <table
            className="chart-table"
            aria-label="Sensor comparison data table"
          >
            <thead>
              <tr>
                <th>Month</th>
                <th>Harmonized</th>
                <th>Raw MODIS</th>
                <th>Raw VIIRS</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, idx) => (
                <tr key={m}>
                  <td>{m}</td>
                  <td>
                    {formatHotspotValue(
                      harmonizedData[idx] === '-' ? null : harmonizedData[idx],
                    )}
                  </td>
                  <td>
                    {formatHotspotValue(
                      modisData[idx] === '-' ? null : modisData[idx],
                    )}
                  </td>
                  <td>
                    {formatHotspotValue(
                      viirsData[idx] === '-' ? null : viirsData[idx],
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
export default ComparisonChart;
