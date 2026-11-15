import { describe, expect, it } from 'vitest'
import { FIRE_RAMP, getRampColor } from './colors.js'

describe('FIRE_RAMP', () => {
  it('runs from a pale low to a deep high', () => {
    expect(FIRE_RAMP).toHaveLength(6)
    expect(FIRE_RAMP[0]).toBe('#fff5eb')
    expect(FIRE_RAMP[FIRE_RAMP.length - 1]).toBe('#a63603')
  })
})

describe('getRampColor', () => {
  it('returns the low colour for zero activity', () => {
    expect(getRampColor(0, 100)).toBe(FIRE_RAMP[0])
  })

  it('returns the low colour for negative or invalid values', () => {
    expect(getRampColor(-5, 100)).toBe(FIRE_RAMP[0])
    expect(getRampColor(Number.NaN, 100)).toBe(FIRE_RAMP[0])
    expect(getRampColor(undefined, 100)).toBe(FIRE_RAMP[0])
  })

  it('returns the high colour at or above the maximum', () => {
    expect(getRampColor(100, 100)).toBe(FIRE_RAMP[FIRE_RAMP.length - 1])
    expect(getRampColor(500, 100)).toBe(FIRE_RAMP[FIRE_RAMP.length - 1])
  })

  it('uses a middle colour for a midpoint value', () => {
    const colour = getRampColor(50, 100)
    expect(colour).not.toBe(FIRE_RAMP[0])
    expect(colour).not.toBe(FIRE_RAMP[FIRE_RAMP.length - 1])
  })

  it('falls back to the low colour when the maximum is unusable', () => {
    expect(getRampColor(10, 0)).toBe(FIRE_RAMP[0])
    expect(getRampColor(10, Number.NaN)).toBe(FIRE_RAMP[0])
  })
})
