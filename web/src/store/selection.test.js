import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  selectCellsInBounds,
  aggregateMonthlySeries,
  getSourceSeries,
    getCellActivity,
} from './selection.js'

describe('selectCellsInBounds', () => {
  const cells = [
    { id: 'cell-a', lat: -6.50, lon: 35.00 },
    { id: 'cell-b', lat: -6.75, lon: 35.00 },
    { id: 'cell-c', lat: -6.50, lon: 35.25 },
  ]

  it('selects cells whose centres fall inside the bounds', () => {
    const selected = selectCellsInBounds(cells, {
      north: -6.20,
      south: -6.60,
      west: 35.10,
      east: 35.40,
    })

    assert.deepEqual(
      selected.map((cell) => cell.id),
      ['cell-a', 'cell-c'],
    )
  })

  it('returns an empty array when no cells match', () => {
    const selected = selectCellsInBounds(cells, {
      north: 0,
      south: -1,
      west: 0,
      east: 1,
    })

    assert.deepEqual(selected, [])
  })

  it('rejects invalid bounds', () => {
    assert.throws(
      () => selectCellsInBounds(cells, {
        north: -6,
        south: -7,
        west: 35,
        east: 34,
      }),
      /Invalid geographic bounds/,
    )
  })
})

describe('aggregateMonthlySeries', () => {
  const dataset = {
    meta: {
      months: ['2000-01', '2000-02'],
    },
    data: {
      'cell-a': [
        [0, 10, 4, 20, 5, 12],
        [1, 15, 6, 30, 8, 18],
      ],
      'cell-c': [
        [0, 5, 2, 10, 3, 6],
      ],
    },
  }

  it('sums monthly values across selected cells', () => {
    const result = aggregateMonthlySeries(
      dataset,
      ['cell-a', 'cell-c'],
      { start: '2000-01', end: '2000-02' },
    )

    assert.deepEqual(result, [
      {
        month: '2000-01',
        modisHotspots: 15,
        modisFireDays: 6,
        viirsHotspots: 30,
        viirsFireDays: 8,
        harmonized: 18,
      },
      {
        month: '2000-02',
        modisHotspots: 15,
        modisFireDays: 6,
        viirsHotspots: 30,
        viirsFireDays: 8,
        harmonized: 18,
      },
    ])
  })

  it('clips results to the requested date range', () => {
    const result = aggregateMonthlySeries(
      dataset,
      ['cell-a', 'cell-c'],
      { start: '2000-02', end: '2000-02' },
    )

    assert.equal(result.length, 1)
    assert.equal(result[0].month, '2000-02')
  })

  it('handles selected cells with no data', () => {
    const result = aggregateMonthlySeries(
      dataset,
      ['missing-cell'],
      { start: '2000-01', end: '2000-02' },
    )

    assert.equal(result[0].modisHotspots, 0)
    assert.equal(result[1].harmonized, 0)
  })
})

describe('getSourceSeries', () => {
  it('extracts the MODIS hotspot series', () => {
    const result = getSourceSeries(
      [
        { month: '2000-01', modisHotspots: 15, viirsHotspots: 30, harmonized: 18 },
      ],
      'modis',
    )

    assert.deepEqual(result, [
      { month: '2000-01', value: 15 },
    ])
  })

  it('rejects unknown sources', () => {
    assert.throws(
      () => getSourceSeries([], 'unknown'),
      /Unknown data source/,
    )
  })
})


describe('getCellActivity', () => {
  const dataset = {
    meta: {
      months: ['2000-01', '2000-02', '2000-03'],
    },
    data: {
      'cell-a': [
        [0, 10, 4, 20, 5, 12],
        [1, 15, 6, 30, 8, 18],
        [2, 5, 2, 10, 3, 6],
      ],
    },
  }

  const dateRange = {
    start: '2000-01',
    end: '2000-03',
  }

  it('calculates MODIS hotspot activity', () => {
    assert.equal(
      getCellActivity(dataset, 'cell-a', 'modis', dateRange),
      30,
    )
  })

  it('calculates VIIRS hotspot activity', () => {
    assert.equal(
      getCellActivity(dataset, 'cell-a', 'viirs', dateRange),
      60,
    )
  })

  it('calculates harmonized activity', () => {
    assert.equal(
      getCellActivity(dataset, 'cell-a', 'harmonized', dateRange),
      36,
    )
  })

  it('respects the selected date range', () => {
    assert.equal(
      getCellActivity(dataset, 'cell-a', 'modis', {
        start: '2000-02',
        end: '2000-02',
      }),
      15,
    )
  })

  it('returns zero for cells without records', () => {
    assert.equal(
      getCellActivity(dataset, 'missing-cell', 'modis', dateRange),
      0,
    )
  })

  it('rejects unknown sources', () => {
    assert.throws(
      () => getCellActivity(dataset, 'cell-a', 'unknown', dateRange),
      /Unknown data source/,
    )
  })
})