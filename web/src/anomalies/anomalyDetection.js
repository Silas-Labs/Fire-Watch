import { computeMedian, formatMonthName } from '../stats.js';
import { getValueForSource, SOURCES } from '../calendar/dataHelpers.js';

/**
 * Computes the Interquartile Range (IQR = Q3 - Q1) of a numeric array.
 * @param {number[]} values
 * @returns {number|null}
 */
export function computeIQR(values) {
  if (!Array.isArray(values) || values.length < 4) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1Idx = Math.floor(n * 0.25);
  const q3Idx = Math.floor(n * 0.75);
  return sorted[q3Idx] - sorted[q1Idx];
}

/**
 * Computes Median Absolute Deviation (MAD = median(|x - median|)).
 * @param {number[]} values
 * @param {number} medianVal
 * @returns {number|null}
 */
export function computeMAD(values, medianVal) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const absoluteDeviations = values.map(v => Math.abs(v - medianVal));
  return computeMedian(absoluteDeviations);
}

/**
 * Detects unusual periods (anomalies) across the monthly series using system design §4.7.
 * 
 * @param {Array<Object>} displayedSeries Active filtered monthly observations to evaluate
 * @param {Array<Object>} fullSeries Complete historical observations for the AOI (baseline)
 * @param {Object} options Configuration
 * @param {string} [options.source='harmonized'] Sensor source
 * @param {number} [options.threshold=3.5] Robust z-score threshold
 * @param {number} [options.absoluteThreshold=15] Fallback absolute departure threshold
 * @returns {Array<Object>} List of detected anomalies sorted by date descending
 */
export function detectAnomalies(displayedSeries, fullSeries, options = {}) {
  const source = options.source || SOURCES.HARMONIZED;
  const threshold = options.threshold !== undefined ? options.threshold : 3.5;
  const absoluteThreshold = options.absoluteThreshold !== undefined ? options.absoluteThreshold : 15;

  if (!displayedSeries || displayedSeries.length === 0) return [];
  const baselineSeries = fullSeries || displayedSeries;

  const anomalies = [];

  for (const item of displayedSeries) {
    if (!item || !item.month) continue;
    const value = getValueForSource(item, source);
    if (value === null) continue; // Skip unobserved periods

    const [targetYearStr, targetMStr] = item.month.split('-');
    const targetYear = parseInt(targetYearStr, 10);

    // Target year is strictly excluded from its own baseline
    const baselineValues = baselineSeries
      .filter(e => {
        if (!e || !e.month) return false;
        const [yrStr, mStr] = e.month.split('-');
        return mStr === targetMStr && parseInt(yrStr, 10) !== targetYear;
      })
      .map(e => getValueForSource(e, source))
      .filter(v => v !== null);

    // Need at least 3 years to compute a meaningful baseline
    if (baselineValues.length < 3) continue;

    const median = computeMedian(baselineValues);
    if (median === null) continue;

    const mad = computeMAD(baselineValues, median);
    let zScore = null;
    let method = 'mad';
    let isHigh = false;
    let isLow = false;

    if (mad !== null && mad > 0) {
      // Primary method: standard robust z-score
      zScore = (0.6745 * (value - median)) / mad;
      if (zScore >= threshold) isHigh = true;
      else if (zScore <= -threshold) isLow = true;
    } else {
      // Fallback 1: MAD == 0, try IQR
      const iqr = computeIQR(baselineValues);
      if (iqr !== null && iqr > 0) {
        method = 'iqr';
        zScore = (1.349 * (value - median)) / iqr;
        if (zScore >= threshold) isHigh = true;
        else if (zScore <= -threshold) isLow = true;
      } else {
        // Fallback 2: MAD == 0 and IQR == 0 (e.g. repeated zeros)
        method = 'absolute';
        const diff = value - median;
        if (diff >= absoluteThreshold) {
          isHigh = true;
          zScore = 99; // Sentinel high
        } else if (-diff >= absoluteThreshold) {
          isLow = true;
          zScore = -99; // Sentinel low
        }
      }
    }

    if (isHigh || isLow) {
      anomalies.push({
        month: item.month,
        monthLabel: formatMonthName(item.month),
        value,
        median,
        mad,
        zScore: zScore !== null ? Number(zScore.toFixed(2)) : null,
        type: isHigh ? 'high' : 'low',
        method,
        baselineCount: baselineValues.length,
      });
    }
  }

  // Sort newest first
  return anomalies.sort((a, b) => (a.month < b.month ? 1 : -1));
}
