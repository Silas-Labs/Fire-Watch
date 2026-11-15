import React, { useState, useMemo } from 'react';
import { detectAnomalies } from './anomalyDetection.js';
import {
  SOURCES,
  SOURCE_METADATA,
  formatHotspotValue,
} from '../calendar/dataHelpers.js';

/**
 * Unusual Periods (Anomalies) List Component (Domain D - Peter)
 * 
 * Flags months where fire activity deviates substantially from the historical baseline.
 * Clicking or pressing Enter on an item highlights its cell in the Burning Calendar.
 * 
 * Props:
 * - displayedSeries: Active filtered series
 * - fullSeries: Complete historical series for the AOI
 * - source: Sensor source
 * - highlightedMonth: Currently highlighted month in calendar ('YYYY-MM' | null)
 * - onSelectAnomaly: (monthStr) => void
 */
export function AnomaliesList({
  displayedSeries = [],
  fullSeries = [],
  source = SOURCES.HARMONIZED,
  highlightedMonth = null,
  onSelectAnomaly,
}) {
  const [threshold, setThreshold] = useState(3.5);
  const meta = SOURCE_METADATA[source] || SOURCE_METADATA[SOURCES.HARMONIZED];

  const anomalies = useMemo(() => {
    return detectAnomalies(displayedSeries, fullSeries, {
      source,
      threshold,
      absoluteThreshold: 15,
    });
  }, [displayedSeries, fullSeries, source, threshold]);

  return (
    <section className="chart-panel" aria-label="Unusual fire activity periods">
      <div className="chart-header">
        <div>
          <h2>Unusual periods</h2>
          <p>
            Months where activity departs from the historical baseline
            (robust z-score). Select an item to highlight it on the calendar.
          </p>
        </div>

        <div className="anomaly-controls">
          <label htmlFor="anomaly-threshold">Sensitivity</label>
          <select
            id="anomaly-threshold"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
          >
            <option value="2.5">2.5 (high)</option>
            <option value="3.0">3.0 (moderate)</option>
            <option value="3.5">3.5 (default)</option>
            <option value="4.0">4.0 (conservative)</option>
          </select>
        </div>
      </div>

      {anomalies.length === 0 ? (
        <div className="chart-empty" role="status">
          No unusual fire periods detected for this selection at threshold ±
          {threshold}.
        </div>
      ) : (
        <div className="anomaly-grid" role="list">
          {anomalies.map((item) => {
            const isSelected = highlightedMonth === item.month;
            const isHigh = item.type === 'high';

            return (
              <div
                key={item.month}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Flagged ${item.type} period ${item.monthLabel}: ${item.value} hotspots compared to median ${item.median}`}
                onClick={() => onSelectAnomaly && onSelectAnomaly(item.month)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSelectAnomaly) onSelectAnomaly(item.month);
                  }
                }}
                className={`anomaly-card${isSelected ? ' is-selected' : ''}`}
              >
                <div className="anomaly-card-top">
                  <span className="anomaly-title">{item.monthLabel}</span>
                  <span
                    className={`anomaly-tag ${isHigh ? 'is-high' : 'is-low'}`}
                  >
                    {isHigh ? 'High anomaly' : 'Low anomaly'}
                  </span>
                </div>

                <div className="anomaly-line">
                  <span>
                    Observed{' '}
                    <strong>
                      {formatHotspotValue(item.value, source)}
                    </strong>{' '}
                    {meta.shortUnit}
                  </span>
                  <span>Median {formatHotspotValue(item.median, source)}</span>
                </div>

                <div className="anomaly-line">
                  <span>
                    Score{' '}
                    <strong>
                      z = {item.zScore !== null ? item.zScore : 'N/A'}
                    </strong>
                  </span>
                  <span>
                    {item.method} · {item.baselineCount} yrs
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
export default AnomaliesList;
