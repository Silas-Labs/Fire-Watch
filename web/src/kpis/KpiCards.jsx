import React, { useMemo } from 'react';
import {
  calculateCurrentMonthKpi,
  calculateBusiestMonthKpi,
  calculateBusiestYearKpi,
} from './kpiCalculations.js';
import {
  SOURCES,
  SOURCE_METADATA,
  formatHotspotValue,
} from '../calendar/dataHelpers.js';

/**
 * Headline KPI Cards Component (Domain D - Peter)
 *
 * Shows:
 * 1. Current Available Month vs. Historical Median
 * 2. Busiest Month in Selection
 * 3. Busiest Year in Selection
 *
 * Props:
 * - displayedSeries: Filtered monthly observations for the current date range
 * - fullSeries: Complete historical observations for the AOI (baseline source)
 * - source: Active sensor source
 */
export function KpiCards({
  displayedSeries = [],
  fullSeries = [],
  source = SOURCES.HARMONIZED,
}) {
  const meta = SOURCE_METADATA[source] || SOURCE_METADATA[SOURCES.HARMONIZED];

  const currentMonthKpi = useMemo(() => {
    return calculateCurrentMonthKpi(displayedSeries, fullSeries, source);
  }, [displayedSeries, fullSeries, source]);

  const busiestMonthKpi = useMemo(() => {
    return calculateBusiestMonthKpi(displayedSeries, source);
  }, [displayedSeries, source]);

  const busiestYearKpi = useMemo(() => {
    return calculateBusiestYearKpi(displayedSeries, source);
  }, [displayedSeries, source]);

  const trendClass =
    currentMonthKpi.status === 'higher'
      ? 'kpi-trend-high'
      : currentMonthKpi.status === 'lower'
        ? 'kpi-trend-low'
        : '';

  return (
    <section className="kpi-grid" aria-label="Fire activity headline figures">
      <article className="kpi-card">
        <span className="kpi-label">
          {currentMonthKpi.targetMonthLabel || 'Current available month'}{' '}
          against the median
        </span>

        <div className="kpi-value-row">
          <span className="kpi-value">
            {formatHotspotValue(currentMonthKpi.currentValue, source, {
              placeholder: '—',
            })}
          </span>
          <span className="kpi-unit">{meta.shortUnit}</span>
        </div>

        <div className="kpi-foot">
          <span>
            Median:{' '}
            <strong>
              {formatHotspotValue(currentMonthKpi.historicalMedian, source, {
                placeholder: '—',
              })}
            </strong>
            {currentMonthKpi.baselineYearCount
              ? ` (${currentMonthKpi.baselineYearCount} yrs)`
              : ''}
          </span>
          {currentMonthKpi.percentText && (
            <span className={trendClass}>{currentMonthKpi.percentText}</span>
          )}
        </div>
      </article>

      <article className="kpi-card is-accent">
        <span className="kpi-label">Busiest month in selection</span>

        <div className="kpi-value-row">
          <span className="kpi-value">
            {formatHotspotValue(busiestMonthKpi.value, source, {
              placeholder: '—',
            })}
          </span>
          <span className="kpi-unit">{meta.shortUnit}</span>
        </div>

        <div className="kpi-foot">
          <span>{busiestMonthKpi.monthLabel || 'No data'}</span>
          <span>Peak monthly activity for the selected period.</span>
        </div>
      </article>

      <article className="kpi-card is-accent">
        <span className="kpi-label">Busiest year in selection</span>

        <div className="kpi-value-row">
          <span className="kpi-value">
            {formatHotspotValue(busiestYearKpi.value, source, {
              placeholder: '—',
            })}
          </span>
          <span className="kpi-unit">{meta.shortUnit}</span>
        </div>

        <div className="kpi-foot">
          <span>
            {busiestYearKpi.hasData
              ? `Year ${busiestYearKpi.year}`
              : 'No data'}
            {busiestYearKpi.isPartial ? ' · partial range' : ''}
          </span>
          <span>Cumulative annual total for the selected area.</span>
        </div>
      </article>
    </section>
  );
}
export default KpiCards;
