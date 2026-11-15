import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { validateDataset } from './dataset.js'

const createDataset = () => ({
  meta: {
    version: 1,
    grid_deg: 0.25,
    months: ['2000-01', '2000-02'],
  },
  cells: [
    { id: 'cell-a', lat: -6.5, lon: 35 },
  ],
  data: {
    'cell-a': [
      [0, 10, 4, 20, 5, 12],
      [1, 15, 6, 30, 8, 18],
    ],
  },
})

describe('dataset measurement validation', () => {
  it('accepts valid six-value measurement records', () => {
    assert.doesNotThrow(() => validateDataset(createDataset()))
  })

  it('rejects data belonging to an unknown cell', () => {
    const dataset = createDataset()
    dataset.data['unknown-cell'] = [[0, 1, 2, 3, 4, 5]]

    assert.throws(
      () => validateDataset(dataset),
      /unknown cell/,
    )
  })

  it('rejects records that do not contain exactly six values', () => {
    const dataset = createDataset()
    dataset.data['cell-a'] = [[0, 10, 4, 20, 5]]

    assert.throws(
      () => validateDataset(dataset),
      /expected 6 values/,
    )
  })

  it('rejects month indexes outside the available months', () => {
    const dataset = createDataset()
    dataset.data['cell-a'] = [[2, 10, 4, 20, 5, 12]]

    assert.throws(
      () => validateDataset(dataset),
      /Invalid month index/,
    )
  })

  it('rejects negative measurements', () => {
    const dataset = createDataset()
    dataset.data['cell-a'] = [[0, 10, -4, 20, 5, 12]]

    assert.throws(
      () => validateDataset(dataset),
      /Invalid measurement value/,
    )
  })

  it('rejects non-finite measurements', () => {
    const dataset = createDataset()
    dataset.data['cell-a'] = [[0, 10, 4, Infinity, 5, 12]]

    assert.throws(
      () => validateDataset(dataset),
      /Invalid measurement value/,
    )
  })

  it('rejects non-array cell records', () => {
    const dataset = createDataset()
    dataset.data['cell-a'] = 'invalid'

    assert.throws(
      () => validateDataset(dataset),
      /must be an array/,
    )
  })
})
