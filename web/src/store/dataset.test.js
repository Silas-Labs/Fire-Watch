import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { validateDataset } from './dataset.js'

const validDataset = {
  meta: {
    version: 1,
    grid_deg: 0.25,
    months: ['2000-01', '2000-02'],
  },
  cells: [
    { id: 'cell-a', lat: -6.5, lon: 35.0 },
    { id: 'cell-b', lat: -6.75, lon: 35.0 },
  ],
  data: {
    'cell-a': [[0, 10, 4, 20, 5, 12]],
    'cell-b': [[1, 15, 6, 30, 8, 18]],
  },
}

describe('validateDataset', () => {
  it('accepts a valid FireWatch dataset', () => {
    assert.equal(validateDataset(validDataset), validDataset)
  })

  it('rejects a missing metadata object', () => {
    assert.throws(
      () => validateDataset({ cells: [], data: {} }),
      /missing metadata/,
    )
  })

  it('rejects an invalid grid size', () => {
    const dataset = {
      ...validDataset,
      meta: { ...validDataset.meta, grid_deg: 0 },
    }

    assert.throws(
      () => validateDataset(dataset),
      /valid grid_deg/,
    )
  })

  it('rejects invalid grid cells', () => {
    const dataset = {
      ...validDataset,
      cells: [{ id: 'cell-a', lat: 'invalid', lon: 35 }],
    }

    assert.throws(
      () => validateDataset(dataset),
      /invalid grid cell/,
    )
  })

  it('rejects duplicate cell IDs', () => {
    const dataset = {
      ...validDataset,
      cells: [
        { id: 'cell-a', lat: -6.5, lon: 35 },
        { id: 'cell-a', lat: -6.75, lon: 35 },
      ],
    }

    assert.throws(
      () => validateDataset(dataset),
      /duplicate cell ID/,
    )
  })

  it('rejects a missing data object', () => {
    const dataset = {
      meta: validDataset.meta,
      cells: validDataset.cells,
    }

    assert.throws(
      () => validateDataset(dataset),
      /data object/,
    )
  })

  it('rejects invalid month metadata', () => {
    const dataset = {
      ...validDataset,
      meta: { ...validDataset.meta, months: '2000-01' },
    }

    assert.throws(
      () => validateDataset(dataset),
      /valid months array/,
    )
  })
})
