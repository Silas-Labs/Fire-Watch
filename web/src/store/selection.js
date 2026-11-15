
const GRID_DEGREES = 0.25

const SOURCE_INDEX = {
  modis: 1,
  viirs: 3,
  harmonized: 5,
}

/**
 * Select grid cells whose centres fall inside the AOI.
 *
 * Cell coordinates represent the southwest corner.
 */
export function selectCellsInBounds(
  cells,
  bounds,
  gridDegrees = GRID_DEGREES,
) {
  const { north, south, east, west } = bounds

  if (
    ![north, south, east, west, gridDegrees].every(Number.isFinite) ||
    north < south ||
    east < west ||
    gridDegrees <= 0
  ) {
    throw new Error('Invalid geographic bounds or grid size')
  }

  return cells.filter((cell) => {
    const centerLat = cell.lat + gridDegrees / 2
    const centerLon = cell.lon + gridDegrees / 2

    return (
      centerLat >= south &&
      centerLat <= north &&
      centerLon >= west &&
      centerLon <= east
    )
  })
}

/**
 * Aggregate all selected cells into a monthly series.
 *
 * Data row format:
 * [monthIndex, modisHot, modisFD, viirsHot, viirsFD, harmonized]
 */
export function aggregateMonthlySeries(
  dataset,
  selectedCellIds,
  dateRange,
) {
  const { months } = dataset.meta
  const { start, end } = dateRange

  if (!start || !end || start > end) {
    throw new Error('Invalid date range')
  }

  const selectedIds = new Set(selectedCellIds)

  const totals = months
    .map((month) => ({
      month,
      modisHotspots: 0,
      modisFireDays: 0,
      viirsHotspots: 0,
      viirsFireDays: 0,
      harmonized: 0,
    }))
    .filter(({ month }) => month >= start && month <= end)

  const monthIndexes = new Map(
    months.map((month, index) => [index, month]),
  )

  for (const cellId of selectedIds) {
    const records = dataset.data[cellId] ?? []

    for (const record of records) {
      const [monthIndex, modisHot, modisFD, viirsHot, viirsFD, harmonized] =
        record

      const month = monthIndexes.get(monthIndex)

      if (!month || month < start || month > end) {
        continue
      }

      const index = totals.findIndex((item) => item.month === month)

      if (index === -1) continue

      totals[index].modisHotspots += modisHot
      totals[index].modisFireDays += modisFD
      totals[index].viirsHotspots += viirsHot
      totals[index].viirsFireDays += viirsFD
      totals[index].harmonized += harmonized
    }
  }

  return totals
}

/**
 * Extract the selected metric from an aggregated monthly series.
 */
export function getSourceSeries(series, source) {
  const sourceIndex = SOURCE_INDEX[source]

  if (sourceIndex === undefined) {
    throw new Error(`Unknown data source: ${source}`)
  }

  const metric = {
    modis: 'modisHotspots',
    viirs: 'viirsHotspots',
    harmonized: 'harmonized',
  }[source]

  return series.map(({ month, ...values }) => ({
    month,
    value: values[metric],
  }))
}

/**
 * Calculate a cell's total fire activity for the selected source and date range.
 */
export function getCellActivity(dataset, cellId, source, dateRange) {
  const sourceIndex = SOURCE_INDEX[source]

  if (sourceIndex === undefined) {
    throw new Error(`Unknown data source: ${source}`)
  }

  const { start, end } = dateRange
  const { months } = dataset.meta

  if (!start || !end || start > end) {
    throw new Error('Invalid date range')
  }

  const records = dataset.data[cellId] ?? []

  return records.reduce((total, record) => {
    const [monthIndex, ...measurements] = record
    const month = months[monthIndex]

    if (!month || month < start || month > end) {
      return total
    }

    return total + measurements[sourceIndex - 1]
  }, 0)
}