import { escapeCsvField } from './aggregateCsv.js';
import { isCellInBbox } from '../store/dataStore.js';

const BASE_URL = import.meta.env?.BASE_URL ?? '/';

export const MAX_RAW_EXPORT_ROWS = 50000;

export const RAW_CSV_COLUMNS = [
  'sensor',
  'satellite',
  'acq_date',
  'acq_time',
  'lat',
  'lon',
  'confidence',
  'frp',
  'daynight',
  'cell_id',
];

/**
 * Generates the filename for raw detections export.
 * @param {string} startMonth 'YYYY-MM'
 * @param {string} endMonth 'YYYY-MM'
 * @returns {string}
 */
export function getRawHotspotsFilename(startMonth, endMonth) {
  const s = startMonth || 'start';
  const e = endMonth || 'end';
  return `firewatch_hotspots_${s}_${e}.csv`;
}

/**
 * Filters raw detections by AOI bounding box and date range, enforcing safety cap.
 * 
 * @param {Array<Object>} detections
 * @param {number[]} bbox [west, south, east, north]
 * @param {string} startMonth 'YYYY-MM'
 * @param {string} endMonth 'YYYY-MM'
 * @param {number} [cap=50000]
 * @returns {{
 *   exportedRows: Array<Object>,
 *   totalMatched: number,
 *   isCapped: boolean,
 *   capLimit: number
 * }}
 */
export function filterAndCapRawDetections(detections, bbox, startMonth, endMonth, cap = MAX_RAW_EXPORT_ROWS) {
  if (!Array.isArray(detections) || detections.length === 0) {
    return { exportedRows: [], totalMatched: 0, isCapped: false, capLimit: cap };
  }

  const matched = [];

  for (const row of detections) {
    if (!row || !row.acq_date) continue;
    const rowMonth = row.acq_date.slice(0, 7);

    // Date range filter
    if (startMonth && rowMonth < startMonth) continue;
    if (endMonth && rowMonth > endMonth) continue;

    // Spatial filter
    if (bbox && !isCellInBbox(row.lat, row.lon, bbox)) continue;

    matched.push(row);
  }

  const totalMatched = matched.length;
  const isCapped = totalMatched > cap;
  const exportedRows = isCapped ? matched.slice(0, cap) : matched;

  return {
    exportedRows,
    totalMatched,
    isCapped,
    capLimit: cap,
  };
}

/**
 * Builds RFC 4180 CSV string for raw detections.
 * @param {Array<Object>} rows
 * @returns {string}
 */
export function generateRawHotspotsCsv(rows) {
  const lines = [RAW_CSV_COLUMNS.join(',')];

  for (const r of rows) {
    const lat = r.lat !== undefined && r.lat !== null ? Number(r.lat).toFixed(4) : '';
    const lon = r.lon !== undefined && r.lon !== null ? Number(r.lon).toFixed(4) : '';
    const frp = r.frp !== undefined && r.frp !== null ? Number(r.frp).toFixed(1) : '';

    const rowValues = [
      escapeCsvField(r.sensor),
      escapeCsvField(r.satellite),
      escapeCsvField(r.acq_date),
      escapeCsvField(r.acq_time),
      escapeCsvField(lat),
      escapeCsvField(lon),
      escapeCsvField(r.confidence),
      escapeCsvField(frp),
      escapeCsvField(r.daynight),
      escapeCsvField(r.cell_id),
    ];
    lines.push(rowValues.join(','));
  }

  return lines.join('\r\n') + '\r\n';
}

/**
 * Fetches detection records for a single year on demand.
 * 
 * @param {number|string} year
 * @param {Function} [fetchFn=fetch]
 * @returns {Promise<Array<Object>>}
 */
function normalizeDetections(payload) {
  if (Array.isArray(payload)) return payload;

  if (
    payload &&
    Array.isArray(payload.columns) &&
    payload.data &&
    typeof payload.data === 'object'
  ) {
    const { columns, data } = payload;
    const count =
      payload.count ??
      (Array.isArray(data[columns[0]]) ? data[columns[0]].length : 0);

    return Array.from({ length: count }, (_, index) =>
      Object.fromEntries(columns.map((column) => [column, data[column]?.[index]])),
    );
  }

  return [];
}

async function decodeJsonResponse(response) {
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;

  if (!isGzip) {
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support gzip decompression');
  }

  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));

  return JSON.parse(await new Response(stream).text());
}

export async function fetchYearlyDetections(year, fetchFn = (typeof window !== 'undefined' ? window.fetch : null)) {
  if (!fetchFn) return [];
  try {
    const response = await fetchFn(`${BASE_URL}data/detections/${year}.json.gz`);
    if (!response.ok) {
      if (response.status === 404) return []; // Missing year is normal (e.g. before sensor launch)
      throw new Error(`Failed to load raw detections for year ${year}: ${response.status}`);
    }
    return normalizeDetections(await decodeJsonResponse(response));
  } catch (err) {
    console.warn(`Could not load raw detections for year ${year}:`, err);
    return [];
  }
}
