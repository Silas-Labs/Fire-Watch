import React, { useState, useMemo, useRef } from 'react';
import {
  SOURCES,
  SOURCE_METADATA,
  filterSeriesByDateRange,
  isValidMonth,
} from '../src/calendar/dataHelpers.js';
import { CalendarHeatmap } from '../src/calendar/CalendarHeatmap.jsx';
import { ComparisonChart } from '../src/charts/ComparisonChart.jsx';
import { AnomaliesList } from '../src/anomalies/AnomaliesList.jsx';
import { SAMPLE_AOIS, SYNTHETIC_MONTHLY_SERIES } from './fixtures.js';

export function PreviewApp() {
  const calendarRef = useRef(null);
  const [selectedAoiId, setSelectedAoiId] = useState(SAMPLE_AOIS[0].id);
  const [startMonth, setStartMonth] = useState('2018-01');
  const [endMonth, setEndMonth] = useState('2024-12');
  const [source, setSource] = useState(SOURCES.HARMONIZED);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateEmpty, setSimulateEmpty] = useState(false);
  const [highlightedMonth, setHighlightedMonth] = useState(null);

  // Active AOI metadata
  const currentAoi = useMemo(() => {
    return SAMPLE_AOIS.find(a => a.id === selectedAoiId) || SAMPLE_AOIS[0];
  }, [selectedAoiId]);

  // Validation
  const validationError = useMemo(() => {
    if (!isValidMonth(startMonth)) return 'Start month must be in YYYY-MM format';
    if (!isValidMonth(endMonth)) return 'End month must be in YYYY-MM format';
    if (startMonth > endMonth) return `Start month (${startMonth}) cannot be after end month (${endMonth})`;
    return null;
  }, [startMonth, endMonth]);

  // Filtered series
  const displayedSeries = useMemo(() => {
    if (simulateEmpty || validationError) return [];
    return filterSeriesByDateRange(SYNTHETIC_MONTHLY_SERIES, startMonth, endMonth);
  }, [simulateEmpty, validationError, startMonth, endMonth]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Synthetic Banner */}
      <header
        role="banner"
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #f97316',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                backgroundColor: '#f97316',
                color: '#000',
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                letterSpacing: '0.05em',
              }}
            >
              Synthetic Data
            </span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              Domain D: Analytics & Delivery Preview
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Isolated development harness for calendar heatmap, comparison charts, KPIs, anomalies, and downloads.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
          <button
            type="button"
            onClick={() => setSimulateLoading(prev => !prev)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: simulateLoading ? '#dc2626' : '#334155',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {simulateLoading ? 'Stop Loading' : 'Simulate Loading'}
          </button>
          <button
            type="button"
            onClick={() => setSimulateEmpty(prev => !prev)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: simulateEmpty ? '#dc2626' : '#334155',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {simulateEmpty ? 'Restore Data' : 'Simulate Empty'}
          </button>
        </div>
      </header>

      {/* Controls Bar */}
      <section
        aria-label="Preview Controls"
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          border: '1px solid #334155',
        }}
      >
        {/* Sample AOI */}
        <div>
          <label htmlFor="preview-aoi" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>
            Sample AOI Preset
          </label>
          <select
            id="preview-aoi"
            value={selectedAoiId}
            onChange={e => setSelectedAoiId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            {SAMPLE_AOIS.map(aoi => (
              <option key={aoi.id} value={aoi.id}>
                {aoi.name}
              </option>
            ))}
          </select>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            {currentAoi.description}
          </div>
        </div>

        {/* Start Month */}
        <div>
          <label htmlFor="preview-start-month" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>
            Start Month (YYYY-MM)
          </label>
          <input
            id="preview-start-month"
            type="text"
            value={startMonth}
            onChange={e => setStartMonth(e.target.value.trim())}
            placeholder="2012-01"
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
            }}
          />
        </div>

        {/* End Month */}
        <div>
          <label htmlFor="preview-end-month" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>
            End Month (YYYY-MM)
          </label>
          <input
            id="preview-end-month"
            type="text"
            value={endMonth}
            onChange={e => setEndMonth(e.target.value.trim())}
            placeholder="2024-12"
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
            }}
          />
        </div>

        {/* Source Switcher */}
        <div>
          <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>
            Sensor Source
          </span>
          <div style={{ display: 'flex', gap: '0.25rem' }} role="group" aria-label="Sensor Source">
            {Object.values(SOURCES).map(s => {
              const meta = SOURCE_METADATA[s];
              const isSelected = source === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSource(s)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.25rem',
                    backgroundColor: isSelected ? '#f97316' : '#0f172a',
                    color: isSelected ? '#000' : '#f8fafc',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Validation or Error State */}
      {validationError && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            backgroundColor: '#7f1d1d',
            border: '1px solid #f87171',
            borderRadius: '6px',
            color: '#fef2f2',
            fontSize: '0.875rem',
          }}
        >
          <strong>Input Error:</strong> {validationError}
        </div>
      )}

      {/* Loading State */}
      {simulateLoading ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: '#1e293b',
            borderRadius: '8px',
            color: '#94a3b8',
          }}
        >
          <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#f8fafc' }}>
            Loading synthetic dataset...
          </div>
          <div>Simulating data fetch and processing for Domain D.</div>
        </div>
      ) : displayedSeries.length === 0 && !validationError ? (
        /* Empty State */
        <div
          role="status"
          style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: '#1e293b',
            borderRadius: '8px',
            border: '1px dashed #475569',
            color: '#94a3b8',
          }}
        >
          <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#f8fafc' }}>
            No Observations in Selected Range
          </div>
          <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.875rem' }}>
            Adjust the date range or choose a different AOI preset to preview fire activity.
          </p>
        </div>
      ) : (
        /* Data Preview Status */
        <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            id="preview-summary-card"
            style={{
              padding: '1rem',
              backgroundColor: '#1e293b',
              borderRadius: '8px',
              border: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Active Selection:</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                {currentAoi.name} ({startMonth} to {endMonth})
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Series Loaded: </span>
              <strong style={{ color: '#f97316' }}>{displayedSeries.length} months</strong>
              <span style={{ fontSize: '0.875rem', color: '#94a3b8', marginLeft: '1rem' }}>Active Source: </span>
              <strong style={{ color: '#38bdf8' }}>{SOURCE_METADATA[source].label}</strong>
            </div>
          </div>

          {/* Calendar Heatmap */}
          <CalendarHeatmap
            ref={calendarRef}
            series={displayedSeries}
            source={source}
            onSourceChange={setSource}
            highlightedMonth={highlightedMonth}
            onCellClick={(monthStr, val) => {
              console.log('Cell clicked:', monthStr, val);
              setHighlightedMonth(prev => prev === monthStr ? null : monthStr);
            }}
          />

          {/* Sensor Comparison Line Chart */}
          <ComparisonChart series={displayedSeries} />

          {/* Unusual Periods (Anomalies) */}
          <AnomaliesList
            displayedSeries={displayedSeries}
            fullSeries={SYNTHETIC_MONTHLY_SERIES}
            source={source}
            highlightedMonth={highlightedMonth}
            onSelectAnomaly={(monthStr) => {
              setHighlightedMonth(prev => prev === monthStr ? null : monthStr);
            }}
          />

        </main>
      )}
    </div>
  );
}
