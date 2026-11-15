import { describe, expect, it } from 'vitest'
import {
  getRangePresets,
  groupMonthsByYear,
  isValidRange,
} from './monthRange.js'

const MONTHS = [
  '2000-11',
  '2000-12',
  '2001-01',
  '2001-02',
  '2001-03',
  '2001-04',
  '2001-05',
  '2001-06',
  '2001-07',
  '2001-08',
  '2001-09',
  '2001-10',
  '2001-11',
  '2001-12',
  '2002-01',
]

describe('groupMonthsByYear', () => {
  it('groups months under their year with human labels', () => {
    expect(groupMonthsByYear(MONTHS)).toEqual([
      {
        year: 2000,
        months: [
          { value: '2000-11', label: 'Nov 2000' },
          { value: '2000-12', label: 'Dec 2000' },
        ],
      },
      {
        year: 2001,
        months: [
          { value: '2001-01', label: 'Jan 2001' },
          { value: '2001-02', label: 'Feb 2001' },
          { value: '2001-03', label: 'Mar 2001' },
          { value: '2001-04', label: 'Apr 2001' },
          { value: '2001-05', label: 'May 2001' },
          { value: '2001-06', label: 'Jun 2001' },
          { value: '2001-07', label: 'Jul 2001' },
          { value: '2001-08', label: 'Aug 2001' },
          { value: '2001-09', label: 'Sep 2001' },
          { value: '2001-10', label: 'Oct 2001' },
          { value: '2001-11', label: 'Nov 2001' },
          { value: '2001-12', label: 'Dec 2001' },
        ],
      },
      {
        year: 2002,
        months: [{ value: '2002-01', label: 'Jan 2002' }],
      },
    ])
  })

  it('ignores invalid or duplicate month strings', () => {
    expect(groupMonthsByYear(['2001-01', 'bad', '2001-01'])).toEqual([
      {
        year: 2001,
        months: [{ value: '2001-01', label: 'Jan 2001' }],
      },
    ])
  })
})

describe('getRangePresets', () => {
  it('returns the full record, last 12 months, last 5 years and VIIRS era', () => {
    expect(getRangePresets(MONTHS)).toEqual([
      { id: 'full', label: 'Full record', start: '2000-11', end: '2002-01' },
      { id: 'last12', label: 'Last 12 months', start: '2001-02', end: '2002-01' },
      { id: 'last5Years', label: 'Last 5 years', start: '2000-11', end: '2002-01' },
      { id: 'viirs', label: 'VIIRS era', start: '2000-11', end: '2002-01' },
    ])
  })

  it('starts the VIIRS preset at January 2012 when available', () => {
    const months = ['2011-11', '2011-12', '2012-01', '2012-02']
    expect(getRangePresets(months).find((preset) => preset.id === 'viirs')).toEqual({
      id: 'viirs',
      label: 'VIIRS era',
      start: '2012-01',
      end: '2012-02',
    })
  })
})

describe('isValidRange', () => {
  it('accepts an ordered range made of known months', () => {
    expect(isValidRange('2000-11', '2002-01', MONTHS)).toBe(true)
    expect(isValidRange('2001-06', '2001-06', MONTHS)).toBe(true)
  })

  it('rejects reversed, unknown or missing months', () => {
    expect(isValidRange('2002-01', '2000-11', MONTHS)).toBe(false)
    expect(isValidRange('1999-01', '2002-01', MONTHS)).toBe(false)
    expect(isValidRange('', '2002-01', MONTHS)).toBe(false)
    expect(isValidRange('2000-11', null, MONTHS)).toBe(false)
  })
})
