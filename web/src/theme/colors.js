/**
 * One sequential fire ramp shared by the map, calendar and exports.
 * Low activity is pale; high activity is deep, saturated orange-red.
 */
export const FIRE_RAMP = [
  '#fff5eb',
  '#fee6ce',
  '#fdd0a2',
  '#fdae6b',
  '#e6550d',
  '#a63603',
]

export const FIRE_RAMP_LABELS = {
  low: 'Low',
  high: 'High',
}

/**
 * Map a value onto the shared fire ramp.
 *
 * @param {number} value
 * @param {number} max
 * @returns {string} a colour from FIRE_RAMP
 */
export function getRampColor(value, max) {
  const numericValue = Number(value)
  const numericMax = Number(max)

  if (
    !Number.isFinite(numericValue) ||
    !Number.isFinite(numericMax) ||
    numericMax <= 0 ||
    numericValue <= 0
  ) {
    return FIRE_RAMP[0]
  }

  if (numericValue >= numericMax) {
    return FIRE_RAMP[FIRE_RAMP.length - 1]
  }

  const index = Math.floor(
    (numericValue / numericMax) * FIRE_RAMP.length,
  )

  return FIRE_RAMP[Math.min(index, FIRE_RAMP.length - 1)]
}
