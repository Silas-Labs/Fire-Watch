import { useMemo, useRef, useState } from 'react'
import { useFireWatch } from './store/useFireWatch.js'
import FireMap from './map/FireMap.jsx'
import {
  SOURCE_METADATA,
  SOURCES,
  aggregateCellRowsToMonthlySeries,
  filterSeriesByDateRange,
  formatHotspotValue,
} from './calendar/dataHelpers.js'
import { CalendarHeatmap } from './calendar/CalendarHeatmap.jsx'
import { ComparisonChart } from './charts/ComparisonChart.jsx'
import { KpiCards } from './kpis/KpiCards.jsx'
import { AnomaliesList } from './anomalies/AnomaliesList.jsx'
import { ExportPanel } from './export/ExportPanel.jsx'
import {
  generateAggregateCsv,
  getAggregateCsvFilename,
  downloadCsvFile,
} from './export/aggregateCsv.js'
import {
  createPresentationCalendarPng,
  downloadDataUrl,
} from './export/calendarPng.js'

function formatValidationMetric(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

function App() {
  const {
    dataset,
    loading,
    error,
    setSource,
    setDateRange,
    selection,
    selectedCells,
    reload,
  } = useFireWatch()

  const months = dataset?.meta.months ?? []
  const calendarRef = useRef(null)
  const [highlightedMonth, setHighlightedMonth] = useState(null)

  const { fullSeries, displayedSeries, cellRows } = useMemo(() => {
    if (!dataset) {
      return { fullSeries: [], displayedSeries: [], cellRows: [] }
    }

    const rows = []

    for (const cell of selectedCells) {
      const records = dataset.data[cell.id] ?? []

      for (const record of records) {
        const [
          monthIndex,
          modisHotspots,
          modisFireDays,
          viirsHotspots,
          viirsFireDays,
          harmonized,
        ] = record
        const month = dataset.meta.months[monthIndex]

        if (!month) continue

        rows.push({
          cell_id: cell.id,
          lat: cell.lat,
          lon: cell.lon,
          month,
          modis_hotspots: modisHotspots,
          modis_fire_days: modisFireDays,
          viirs_hotspots: viirsHotspots,
          viirs_fire_days: viirsFireDays,
          harmonized,
        })
      }
    }

    const full = aggregateCellRowsToMonthlySeries(rows)
    const displayed = filterSeriesByDateRange(
      full,
      selection.dateRange.start,
      selection.dateRange.end,
    )

    return { fullSeries: full, displayedSeries: displayed, cellRows: rows }
  }, [
    dataset,
    selectedCells,
    selection.dateRange.start,
    selection.dateRange.end,
  ])

  const exportBbox = selection.aoi
    ? [
        selection.aoi.west,
        selection.aoi.south,
        selection.aoi.east,
        selection.aoi.north,
      ]
    : null

  const validation = dataset?.meta?.validation ?? {}
  const calibration = dataset?.meta?.calibration ?? {}
  const validationPending =
    validation.status === 'placeholder' ||
    calibration.status === 'placeholder'

  const firstMonth = months[0] ?? ''
  const lastMonth = months[months.length - 1] ?? ''

  function handleExportCsv() {
    if (cellRows.length === 0) return

    const csv = generateAggregateCsv(
      cellRows,
      selection.dateRange.start,
      selection.dateRange.end,
    )
    downloadCsvFile(
      csv,
      getAggregateCsvFilename(
        selection.dateRange.start,
        selection.dateRange.end,
      ),
    )
  }

  async function handleExportPng() {
    if (!calendarRef.current) return

    const rawDataUrl = calendarRef.current.getDataUrl()

    if (!rawDataUrl) {
      window.alert('Calendar has no active data to export.')
      return
    }

    const sourceMeta =
      SOURCE_METADATA[selection.source] ||
      SOURCE_METADATA[SOURCES.HARMONIZED]

    const compositedUrl = await createPresentationCalendarPng(rawDataUrl, {
      aoiName: selection.aoi ? 'Custom AOI' : 'Tanzania study area',
      dateRange: `${selection.dateRange.start} to ${selection.dateRange.end}`,
      sourceLabel: sourceMeta.label,
      unit: sourceMeta.unit,
    })

    downloadDataUrl(compositedUrl, 'firewatch_calendar.png')
  }

  function toggleHighlightedMonth(month) {
    setHighlightedMonth((current) => (current === month ? null : month))
  }

  function handleStartChange(start) {
    setDateRange({
      start,
      end:
        start > selection.dateRange.end
          ? start
          : selection.dateRange.end,
    })
  }

  function handleEndChange(end) {
    setDateRange({
      start:
        end < selection.dateRange.start
          ? end
          : selection.dateRange.start,
      end,
    })
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <h1>FireWatch</h1>
          <p>
            Tanzania burning calendar, {firstMonth.slice(0, 4)} to{' '}
            {lastMonth.slice(0, 4)}, MODIS and VIIRS on one scale
          </p>
        </div>

        <div className="header-controls">
          <div
            className="segmented"
            role="group"
            aria-label="Observation source"
          >
            {Object.values(SOURCES).map((source) => (
              <button
                key={source}
                type="button"
                className={selection.source === source ? 'is-active' : ''}
                aria-pressed={selection.source === source}
                onClick={() => setSource(source)}
              >
                {SOURCE_METADATA[source].label}
              </button>
            ))}
          </div>

          <label className="field">
            <span>From</span>
            <select
              value={selection.dateRange.start}
              onChange={(event) => handleStartChange(event.target.value)}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>To</span>
            <select
              value={selection.dateRange.end}
              onChange={(event) => handleEndChange(event.target.value)}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>

          <button
            className="btn btn-primary"
            type="button"
            onClick={handleExportCsv}
            disabled={cellRows.length === 0}
          >
            Download CSV
          </button>
        </div>
      </header>

      {error && (
        <section className="feedback-panel error-panel" role="alert">
          <div>
            <h2>Dataset unavailable</h2>
            <p>{error}</p>
          </div>

          <button className="btn btn-secondary" type="button" onClick={reload}>
            Retry connection
          </button>
        </section>
      )}

      {loading && (
        <section className="feedback-panel loading-panel" aria-live="polite">
          <span className="loader" />

          <div>
            <h2>Preparing FireWatch</h2>
            <p>
              Loading and validating the historical fire observation
              dataset.
            </p>
          </div>
        </section>
      )}

      {dataset && !loading && !error && (
        <div className="main-column">
          <KpiCards
            displayedSeries={displayedSeries}
            fullSeries={fullSeries}
            source={selection.source}
          />

          <div className="insight-grid">
            <section className="panel map-panel">
              <div className="panel-heading panel-heading-row">
                <div>
                  <h2>Fire activity map</h2>
                  <p>
                    Satellite detections for{' '}
                    {selection.dateRange.start} to {selection.dateRange.end}
                    , coloured by relative intensity. Pan and zoom inside the
                    study area.
                  </p>
                </div>
                <span className="map-badge">
                  {selectedCells.length.toLocaleString()} cells
                </span>
              </div>

              <div className="map-canvas">
                <FireMap />
              </div>

              <div className="map-status">
                <span>{selection.source.toUpperCase()}</span>
                <span>{selection.dateRange.start} — {selection.dateRange.end}</span>
                <span>Tanzania study area</span>
              </div>
            </section>

            <CalendarHeatmap
              ref={calendarRef}
              series={displayedSeries}
              source={selection.source}
              highlightedMonth={highlightedMonth}
              onCellClick={toggleHighlightedMonth}
            />
          </div>

            <ComparisonChart series={displayedSeries} />

            <AnomaliesList
              displayedSeries={displayedSeries}
              fullSeries={fullSeries}
              source={selection.source}
              highlightedMonth={highlightedMonth}
              onSelectAnomaly={toggleHighlightedMonth}
            />

            <ExportPanel
              cellRows={cellRows}
              startMonth={selection.dateRange.start}
              endMonth={selection.dateRange.end}
              bbox={exportBbox}
              onExportPng={handleExportPng}
            />

            <section className="panel validation-panel">
              <div className="panel-heading panel-heading-row">
                <div>
                  <h2>Harmonization validation</h2>
                  <p>
                    Calibration metadata reported by the data pipeline.
                    Held-out years are used where available.
                  </p>
                </div>
                <span className="panel-badge">
                  {validationPending ? 'Calibration pending' : 'Validated'}
                </span>
              </div>

              <div className="validation-grid">
                <article>
                  <span>Pearson correlation (r)</span>
                  <strong>{formatValidationMetric(validation.pearson)}</strong>
                  <small>Linear agreement between sensors</small>
                </article>

                <article>
                  <span>Spearman rank (ρ)</span>
                  <strong>{formatValidationMetric(validation.spearman)}</strong>
                  <small>Rank-order agreement</small>
                </article>

                <article>
                  <span>Mean absolute error</span>
                  <strong>{formatValidationMetric(validation.mae)}</strong>
                  <small>Hotspots per grid cell-month</small>
                </article>

                <article>
                  <span>Annual total error</span>
                  <strong>
                    {Number.isFinite(validation.annual_total_relative_error)
                      ? `${(
                          validation.annual_total_relative_error * 100
                        ).toFixed(1)}%`
                      : '—'}
                  </strong>
                  <small>Relative error on annual totals</small>
                </article>
              </div>

              <p className="validation-note">
                {validationPending
                  ? 'The bundled dataset is a placeholder export. Validation figures will populate when the pipeline calibration run replaces it.'
                  : `Training period ${calibration.train ?? '—'} · test period ${calibration.test ?? '—'}.`}
                {Number.isFinite(validation.bias) && (
                  <>
                    {' '}
                    Bias:{' '}
                    {formatHotspotValue(validation.bias, selection.source)}
                  </>
                )}
              </p>
            </section>

            <p className="app-note">
              Hotspots are thermal detections, not fire boundaries. A day
              with no detection can still hold a fire the satellites missed.
            </p>
        </div>
      )}
    </main>
  )
}

export default App
