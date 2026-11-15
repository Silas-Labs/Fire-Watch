import React, { useState } from 'react';
import {
  generateAggregateCsv,
  getAggregateCsvFilename,
  downloadCsvFile,
} from './aggregateCsv.js';
import {
  filterAndCapRawDetections,
  generateRawHotspotsCsv,
  getRawHotspotsFilename,
  fetchYearlyDetections,
  MAX_RAW_EXPORT_ROWS,
} from './rawHotspotsExport.js';

/**
 * Export Panel Component (Domain D - Peter)
 * 
 * Provides downloads for the current selection:
 * 1. Aggregate CSV (always available, cell_month table)
 * 2. Calendar PNG (Issue #9)
 * 3. Capped Raw-detection CSV with 50,000 row safety cap (Issue #11)
 * 
 * Props:
 * - cellRows: Array of cell-month rows for the current AOI
 * - startMonth: 'YYYY-MM'
 * - endMonth: 'YYYY-MM'
 * - bbox: [w, s, e, n]
 * - onExportPng: () => void
 * - rawDetectionsFallback: Array of raw detections for test/offline environments
 */
export function ExportPanel({
  cellRows = [],
  startMonth,
  endMonth,
  bbox,
  onExportPng,
  rawDetectionsFallback = [],
}) {
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [rawModalOpen, setRawModalOpen] = useState(false);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState(null);
  const [rawExportResult, setRawExportResult] = useState(null);

  // Aggregate CSV Download
  const handleDownloadAggregate = () => {
    try {
      const csv = generateAggregateCsv(cellRows, startMonth, endMonth);
      const filename = getAggregateCsvFilename(startMonth, endMonth);
      downloadCsvFile(csv, filename);
      setDownloadSuccess(`Downloaded ${filename}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('Aggregate CSV export failed:', err);
    }
  };

  // Raw Hotspots Export Modal Trigger
  const handleOpenRawModal = async () => {
    setRawModalOpen(true);
    setRawLoading(true);
    setRawError(null);
    setRawExportResult(null);

    try {
      const startYear = parseInt((startMonth || '2000').slice(0, 4), 10);
      const endYear = parseInt((endMonth || '2025').slice(0, 4), 10);

      let allDetections = [...rawDetectionsFallback];

      // Fetch on-demand only for years inside the selected range
      if (typeof window !== 'undefined' && window.fetch) {
        for (let y = startYear; y <= endYear; y++) {
          const yearly = await fetchYearlyDetections(y);
          if (Array.isArray(yearly) && yearly.length > 0) {
            allDetections = allDetections.concat(yearly);
          }
        }
      }

      // Filter and evaluate cap
      const result = filterAndCapRawDetections(allDetections, bbox, startMonth, endMonth, MAX_RAW_EXPORT_ROWS);
      setRawExportResult(result);
      setRawLoading(false);
    } catch (err) {
      console.error('Raw export preparation failed:', err);
      setRawError(err.message || 'Failed to prepare raw detections.');
      setRawLoading(false);
    }
  };

  const handleDownloadRawCsv = () => {
    if (!rawExportResult || rawExportResult.exportedRows.length === 0) return;
    try {
      const csv = generateRawHotspotsCsv(rawExportResult.exportedRows);
      const filename = getRawHotspotsFilename(startMonth, endMonth);
      downloadCsvFile(csv, filename);
      setDownloadSuccess(`Downloaded ${filename} (${rawExportResult.exportedRows.length.toLocaleString()} rows)`);
      setRawModalOpen(false);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch {
      setRawError('Error generating raw CSV file.');
    }
  };

  const matchingRowCount = cellRows.filter(r => {
    if (!r || !r.month) return false;
    if (startMonth && r.month < startMonth) return false;
    if (endMonth && r.month > endMonth) return false;
    return true;
  }).length;

  return (
    <section className="chart-panel" aria-label="Data downloads and export actions">
      <div className="chart-header">
        <div>
          <h2>Data downloads</h2>
          <p>
            Export the active selection as harmonized tabular data or a
            presentation-ready calendar image.
          </p>
        </div>
      </div>

      <div className="export-grid">
        <div className="export-card">
          <div>
            <div className="export-card-top">
              <span className="export-title">Aggregate CSV</span>
              <span className="export-badge">Required</span>
            </div>
            <p>
              Harmonized cell-month table with MODIS, VIIRS and calibrated
              counts.
            </p>
            <p>
              {matchingRowCount.toLocaleString()} cell-months in selection.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadAggregate}
            disabled={matchingRowCount === 0}
          >
            Download aggregate CSV
          </button>
        </div>

        <div className="export-card">
          <div>
            <div className="export-card-top">
              <span className="export-title">Calendar image</span>
              <span className="export-badge">PNG</span>
            </div>
            <p>
              High-resolution snapshot of the burning calendar heatmap.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onExportPng}
          >
            Download calendar PNG
          </button>
        </div>

        <div className="export-card">
          <div>
            <div className="export-card-top">
              <span className="export-title">Raw detections CSV</span>
              <span className="export-badge">Capped at 50k</span>
            </div>
            <p>
              Quality-filtered FIRMS detections for the selected dates and
              area.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleOpenRawModal}
          >
            Export raw hotspots
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="export-success" role="status">
          {downloadSuccess}
        </div>
      )}

      {rawModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="raw-export-modal-title"
        >
          <div className="modal">
            <div className="modal-header">
              <h3 id="raw-export-modal-title">
                Raw hotspot detections export
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setRawModalOpen(false)}
                aria-label="Close"
              >
                &#215;
              </button>
            </div>

            {rawLoading ? (
              <div className="modal-muted">Fetching and filtering raw detections.</div>
            ) : rawError ? (
              <div className="modal-error">{rawError}</div>
            ) : rawExportResult ? (
              <div className="export-grid">
                <div>
                  <span className="modal-muted">Detections matched: </span>
                  <strong>
                    {rawExportResult.totalMatched.toLocaleString()} hotspots
                  </strong>
                </div>

                {rawExportResult.isCapped && (
                  <div className="modal-warning" role="alert">
                    Your selection matches{' '}
                    <strong>
                      {rawExportResult.totalMatched.toLocaleString()}
                    </strong>{' '}
                    rows, above the browser limit of{' '}
                    <strong>{MAX_RAW_EXPORT_ROWS.toLocaleString()}</strong>.
                    The export will contain the first{' '}
                    {MAX_RAW_EXPORT_ROWS.toLocaleString()} rows. Use the
                    aggregate CSV for the full selection.
                  </div>
                )}

                {rawExportResult.totalMatched === 0 ? (
                  <p className="modal-muted">
                    No raw hotspot detections were found matching the selected
                    area and date range.
                  </p>
                ) : (
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleDownloadRawCsv}
                    >
                      {rawExportResult.isCapped
                        ? `Download first ${MAX_RAW_EXPORT_ROWS.toLocaleString()} rows`
                        : `Download all ${rawExportResult.totalMatched.toLocaleString()} rows`}
                    </button>
                    {rawExportResult.isCapped && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setRawModalOpen(false);
                          handleDownloadAggregate();
                        }}
                      >
                        Aggregate CSV
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
export default ExportPanel;
