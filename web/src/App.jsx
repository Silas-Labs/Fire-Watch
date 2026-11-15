import { useMemo, useRef, useState } from 'react'
import { useFireWatch } from './store/useFireWatch.js'
import FireMap from './map/FireMap.jsx'
import {
  SOURCE_METADATA,
  SOURCES,
  aggregateCellRowsToMonthlySeries,
  filterSeriesByDateRange,
} from './calendar/dataHelpers.js'
import { CalendarHeatmap } from './calendar/CalendarHeatmap.jsx'
import { ComparisonChart } from './charts/ComparisonChart.jsx'
import { MonthRangeControl } from './controls/MonthRangeControl.jsx'
import { AnomaliesList } from './anomalies/AnomaliesList.jsx'
import { DownloadMenu } from './export/DownloadMenu.jsx'
import {
  generateAggregateCsv,
  getAggregateCsvFilename,
  downloadCsvFile,
} from './export/aggregateCsv.js'
import {
  createPresentationCalendarPng,
  downloadDataUrl,
} from './export/calendarPng.js'

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

  function handleRangeChange(range) {
    setDateRange(range)
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

        {dataset && !loading && !error && (
          <div className="header-actions">
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

            <MonthRangeControl
              months={months}
              start={selection.dateRange.start}
              end={selection.dateRange.end}
              onChange={handleRangeChange}
              source={selection.source}
            />

            <DownloadMenu
              onDownloadCsv={handleExportCsv}
              onDownloadPng={handleExportPng}
              csvDisabled={cellRows.length === 0}
            />
          </div>
        )}
      </header>

      {error && (
        <section className="feedback-panel error-panel" role="alert">
          <div>
            <h2>Fire data could not load</h2>
            <p>{error}</p>
          </div>

          <button className="btn btn-secondary" type="button" onClick={reload}>
            Try again
          </button>
        </section>
      )}

      {loading && (
        <section className="feedback-panel loading-panel" aria-live="polite">
          <span className="loader" />

          <div>
            <h2>Loading fire data</h2>
            <p>Checking the harmonized hotspot record.</p>
          </div>
        </section>
      )}

      {dataset && !loading && !error && (
        <div className="main-column">
          <div className="dashboard-grid">
            <section className="panel map-panel">
              <div className="panel-heading panel-heading-row">
                <div>
                  <h2>Fire activity map</h2>
                  <p>
                    Hotspots for the selected period, shaded from low to high
                    relative to this selection. Pan and zoom inside the study
                    area.
                  </p>
                </div>
                <span className="map-badge">
                  {selectedCells.length.toLocaleString()} cells
                </span>
              </div>

              <div className="map-canvas">
                <FireMap />
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
        </div>
      )}
    </main>
  )
}

export default App
