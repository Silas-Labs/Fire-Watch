import { describe, it, expect } from 'vitest'
import { computeMedian, formatMonthName } from './stats.js'

describe('computeMedian', () => {
  it('calculates median for odd-length array', () => {
    expect(computeMedian([10, 20, 30])).toBe(20)
    expect(computeMedian([50, 10, 20, 90, 30])).toBe(30)
  })

  it('calculates median for even-length array', () => {
    expect(computeMedian([10, 20, 30, 40])).toBe(25)
    expect(computeMedian([100, 200])).toBe(150)
  })

  it('handles single item and empty arrays', () => {
    expect(computeMedian([42])).toBe(42)
    expect(computeMedian([])).toBeNull()
    expect(computeMedian(null)).toBeNull()
  })
})

describe('formatMonthName', () => {
  it('formats month strings to readable text', () => {
    expect(formatMonthName('2024-08')).toBe('August 2024')
    expect(formatMonthName('2019-12')).toBe('December 2019')
  })
})
