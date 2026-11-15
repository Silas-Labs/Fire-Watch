const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Statistical median of a numeric array.
 *
 * @param {number[]} values
 * @returns {number|null}
 */
export function computeMedian(values) {
  if (!Array.isArray(values) || values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }

  return sorted[mid]
}

/**
 * Format a 'YYYY-MM' string as 'August 2022'.
 *
 * @param {string} monthStr
 * @returns {string}
 */
export function formatMonthName(monthStr) {
  if (!monthStr || typeof monthStr !== 'string') return ''

  const [year, month] = monthStr.split('-')
  const monthIndex = Number(month)

  if (monthIndex >= 1 && monthIndex <= 12) {
    return `${MONTH_NAMES[monthIndex - 1]} ${year}`
  }

  return monthStr
}
