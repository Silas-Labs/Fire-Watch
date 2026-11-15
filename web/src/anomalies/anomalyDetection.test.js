import { describe, it, expect } from 'vitest';
import {
  computeIQR,
  computeMAD,
  detectAnomalies,
} from './anomalyDetection.js';

describe('anomalyDetection', () => {
  describe('computeIQR', () => {
    it('computes IQR correctly', () => {
      const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const iqr = computeIQR(vals);
      expect(iqr).toBe(5); // 7 - 2
    });

    it('returns null for insufficient elements', () => {
      expect(computeIQR([1, 2])).toBeNull();
    });
  });

  describe('computeMAD', () => {
    it('computes median absolute deviation', () => {
      const vals = [1, 1, 2, 2, 4, 6, 9];
      const median = 2;
      // Absolute deviations: |1-2|=1, |1-2|=1, |2-2|=0, |2-2|=0, |4-2|=2, |6-2|=4, |9-2|=7
      // Sorted deviations: [0, 0, 1, 1, 2, 4, 7] -> median is 1
      expect(computeMAD(vals, median)).toBe(1);
    });
  });

  describe('detectAnomalies', () => {
    // 5 historical years with modest fire activity (values: 40, 45, 50, 55, 60 -> median 50)
    // 2024 has an extreme spike: 200
    // baseline median = 50, deviations: 10, 5, 0, 5, 10 -> MAD = 5
    // z = 0.6745 * (200 - 50) / 5 = 0.6745 * 30 = 20.235 >> 3.5 -> High anomaly!
    const testSeries = [
      { month: '2019-08', harmonized: 40 },
      { month: '2020-08', harmonized: 45 },
      { month: '2021-08', harmonized: 50 },
      { month: '2022-08', harmonized: 55 },
      { month: '2023-08', harmonized: 60 },
      { month: '2024-08', harmonized: 200 }, // Anomaly
    ];

    it('flags high anomaly using robust z-score formula', () => {
      const anomalies = detectAnomalies(testSeries, testSeries, { threshold: 3.5 });
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].month).toBe('2024-08');
      expect(anomalies[0].type).toBe('high');
      expect(anomalies[0].zScore).toBeGreaterThan(15);
      expect(anomalies[0].method).toBe('mad');
    });

    it('strictly excludes target year from its own baseline', () => {
      const singleYear = [{ month: '2024-08', harmonized: 200 }];
      // Target year excluded leaves 0 baseline items -> no anomaly flagged due to sparse history
      const anomalies = detectAnomalies(singleYear, singleYear);
      expect(anomalies.length).toBe(0);
    });

    it('handles zero-MAD with IQR fallback', () => {
      // 5 years where >50% have value 10, but ends vary
      // values: [10, 10, 10, 10, 20] -> median = 10, deviations: [0, 0, 0, 0, 10] -> MAD = 0
      // IQR = 10 - 10 = 0 -> test with nonzero IQR:
      const iqrSeries = [
        { month: '2019-08', harmonized: 5 },
        { month: '2020-08', harmonized: 10 },
        { month: '2021-08', harmonized: 10 },
        { month: '2022-08', harmonized: 10 },
        { month: '2023-08', harmonized: 25 },
        { month: '2024-08', harmonized: 90 }, // anomaly
      ];
      const anomalies = detectAnomalies(iqrSeries, iqrSeries);
      expect(anomalies.some(a => a.month === '2024-08')).toBe(true);
    });

    it('handles zero-MAD zero-IQR with absolute departure fallback', () => {
      // Wet season all zeros:
      const zeroSeries = [
        { month: '2019-04', harmonized: 0 },
        { month: '2020-04', harmonized: 0 },
        { month: '2021-04', harmonized: 0 },
        { month: '2022-04', harmonized: 0 },
        { month: '2023-04', harmonized: 0 },
        { month: '2024-04', harmonized: 30 }, // Sudden unseasonal burning
      ];
      const anomalies = detectAnomalies(zeroSeries, zeroSeries, { absoluteThreshold: 15 });
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].month).toBe('2024-04');
      expect(anomalies[0].type).toBe('high');
      expect(anomalies[0].method).toBe('absolute');
    });
  });
});
