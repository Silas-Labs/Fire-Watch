const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

function sortedMonths(months) {
  if (!Array.isArray(months)) return []

  return [...new Set(months)]
    .filter(
      (month) =>
        typeof month === 'string' && MONTH_PATTERN.test(month),
    )
    .sort()
}

/**
 * Group 'YYYY-MM' values under their year for an optgroup select.
 *
 * @param {string[]} months
 * @returns {Array<{year: number, months: Array<{value: string, label: string}>}>}
 */
export function groupMonthsByYear(months) {
  const groups = new Map()

  for (const value of sortedMonths(months)) {
    const [yearText, monthText] = value.split('-')
    const year = Number(yearText)
    const month = Number(monthText)

    if (!groups.has(year)) {
      groups.set(year, [])
    }

    groups.get(year).push({
      value,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
    })
  }

  return Array.from(groups, ([year, items]) => ({
    year,
    months: items,
  }))
}

/**
 * Presets for the common ranges an emergency manager needs.
 *
 * @param {string[]} months
 * @returns {Array<{id: string, label: string, start: string, end: string}>}
 */
export function getRangePresets(months) {
  const sorted = sortedMonths(months)

  if (sorted.length === 0) return []

  const end = sorted[sorted.length - 1]
  const start = sorted[0]
  const lastTwelveStart = sorted[Math.max(0, sorted.length - 12)]
  const lastFiveYearsStart = sorted[Math.max(0, sorted.length - 60)]
  const viirsStart =
    sorted.find((month) => month >= '2012-01') ?? start

  return [
    { id: 'full', label: 'Full record', start, end },
    { id: 'last12', label: 'Last 12 months', start: lastTwelveStart, end },
    { id: 'last5Years', label: 'Last 5 years', start: lastFiveYearsStart, end },
    { id: 'viirs', label: 'VIIRS era', start: viirsStart, end },
  ]
}

/**
 * A range is valid only when both endpoints exist in the dataset and are ordered.
 *
 * @param {string} start
 * @param {string} end
 * @param {string[]} months
 * @returns {boolean}
 */
export function isValidRange(start, end, months) {
  if (typeof start !== 'string' || typeof end !== 'string') return false
  if (!MONTH_PATTERN.test(start) || !MONTH_PATTERN.test(end)) return false
  if (start > end) return false

  const available = new Set(sortedMonths(months))

  return available.has(start) && available.has(end)
}

/**
 * Advance a draft range after the user clicks a month in the calendar.
 *
 * @param {{start: string|null, end: string|null, selecting: 'start'|'end'|'done'}} draft
 * @param {string} clicked
 * @returns {{start: string, end: string|null, selecting: 'end'|'done'}}
 */
export function resolveRangeClick(draft, clicked) {
  const start = draft?.start ?? null
  const selecting = draft?.selecting ?? 'start'

  if (selecting === 'start' || !start) {
    return { start: clicked, end: null, selecting: 'end' }
  }

  if (selecting === 'end') {
    if (clicked < start) {
      return { start: clicked, end: start, selecting: 'done' }
    }

    return { start, end: clicked, selecting: 'done' }
  }

  return { start: clicked, end: null, selecting: 'end' }
}
