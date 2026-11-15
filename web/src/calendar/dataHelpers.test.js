import { describe, it, expect } from 'vitest';
import {
  SOURCES,
  isValidMonth,
  generateMonthRange,
  getValueForSource,
  formatHotspotValue,
  filterSeriesByDateRange,
  validateMonthlySeries,
  aggregateCellRowsToMonthlySeries,
} from './dataHelpers.js';
import { SYNTHETIC_MONTHLY_SERIES, SYNTHETIC_CELL_ROWS } from '../data/fixtures.js';

describe('dataHelpers', () => {
  describe('isValidMonth', () => {
    it('validates YYYY-MM formatted strings correctly', () => {
      expect(isValidMonth('2020-01')).toBe(true);
      expect(isValidMonth('2000-12')).toBe(true);
      expect(isValidMonth('1999-00')).toBe(false);
      expect(isValidMonth('2020-13')).toBe(false);
      expect(isValidMonth('2020/01')).toBe(false);
      expect(isValidMonth('')).toBe(false);
      expect(isValidMonth(null)).toBe(false);
      expect(isValidMonth(12345)).toBe(false);
    });
  });

  describe('generateMonthRange', () => {
    it('generates an inclusive sequence of months', () => {
      const range = generateMonthRange('2021-10', '2022-02');
      expect(range).toEqual([
        '2021-10',
        '2021-11',
        '2021-12',
        '2022-01',
        '2022-02',
      ]);
    });

    it('returns a single month when start and end are identical', () => {
      const range = generateMonthRange('2020-06', '2020-06');
      expect(range).toEqual(['2020-06']);
    });

    it('returns empty array when start > end', () => {
      const range = generateMonthRange('2022-05', '2021-05');
      expect(range).toEqual([]);
    });

    it('throws error for invalid month format', () => {
      expect(() => generateMonthRange('invalid', '2020-01')).toThrow();
    });
  });

  describe('getValueForSource', () => {
    const entry = {
      month: '2016-08',
      modis_hotspots: 150,
      modis_fire_days: 18,
      viirs_hotspots: 450,
      viirs_fire_days: 24,
      harmonized: 102.35,
    };

    it('extracts harmonized value with fraction support', () => {
      expect(getValueForSource(entry, SOURCES.HARMONIZED)).toBe(102.35);
    });

    it('extracts raw MODIS and VIIRS hotspots', () => {
      expect(getValueForSource(entry, SOURCES.MODIS)).toBe(150);
      expect(getValueForSource(entry, SOURCES.VIIRS)).toBe(450);
    });

    it('distinguishes true zero (0) from unavailable (null/undefined)', () => {
      const zeroEntry = { month: '2010-04', modis_hotspots: 0, viirs_hotspots: null, harmonized: 0 };
      expect(getValueForSource(zeroEntry, SOURCES.MODIS)).toBe(0);
      expect(getValueForSource(zeroEntry, SOURCES.HARMONIZED)).toBe(0);
      expect(getValueForSource(zeroEntry, SOURCES.VIIRS)).toBeNull(); // VIIRS unavailable in 2010
    });

    it('returns null for null entry or missing fields', () => {
      expect(getValueForSource(null, SOURCES.HARMONIZED)).toBeNull();
      expect(getValueForSource({}, SOURCES.HARMONIZED)).toBeNull();
    });
  });

  describe('formatHotspotValue', () => {
    it('formats integers without decimals and fractional values with decimals', () => {
      expect(formatHotspotValue(0)).toBe('0');
      expect(formatHotspotValue(150)).toBe('150');
      expect(formatHotspotValue(102.345, SOURCES.HARMONIZED, { decimals: 1 })).toBe('102.3');
      expect(formatHotspotValue(null)).toBe('No data');
      expect(formatHotspotValue(undefined, undefined, { placeholder: 'N/A' })).toBe('N/A');
    });
  });

  describe('filterSeriesByDateRange', () => {
    it('filters inclusive date bounds without mutating input', () => {
      const filtered = filterSeriesByDateRange(SYNTHETIC_MONTHLY_SERIES, '2015-06', '2015-08');
      expect(filtered.length).toBe(3);
      expect(filtered[0].month).toBe('2015-06');
      expect(filtered[2].month).toBe('2015-08');
      // Full series unchanged
      expect(SYNTHETIC_MONTHLY_SERIES.length).toBe(26 * 12);
    });

    it('returns all when bounds are omitted', () => {
      const all = filterSeriesByDateRange(SYNTHETIC_MONTHLY_SERIES, null, null);
      expect(all.length).toBe(SYNTHETIC_MONTHLY_SERIES.length);
    });
  });

  describe('validateMonthlySeries', () => {
    it('validates synthetic fixtures structure successfully', () => {
      const result = validateMonthlySeries(SYNTHETIC_MONTHLY_SERIES);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('flags malformed rows', () => {
      const bad = [{ month: 'bad-month' }, null];
      const result = validateMonthlySeries(bad);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  describe('aggregateCellRowsToMonthlySeries', () => {
    it('sums cell rows by month correctly', () => {
      const agg = aggregateCellRowsToMonthlySeries(SYNTHETIC_CELL_ROWS);
      expect(agg.length).toBe(3); // 2022-04, 2022-07, 2022-08

      const jul = agg.find(x => x.month === '2022-07');
      expect(jul.modis_hotspots).toBe(18 + 24); // 42
      expect(jul.viirs_hotspots).toBe(52 + 68); // 120
      expect(jul.harmonized).toBeCloseTo(19.35 + 25.80, 2);

      const apr = agg.find(x => x.month === '2022-04');
      expect(apr.modis_hotspots).toBe(0);
      expect(apr.harmonized).toBe(0);
    });
  });
});
