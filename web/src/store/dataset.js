/**
 * Validate the structure of the precomputed FireWatch dataset.
 */
export function validateDataset(dataset) {
  if (!dataset || typeof dataset !== 'object') {
    throw new Error('Dataset must be a JSON object')
  }

  const { meta, cells, data } = dataset

  if (!meta || typeof meta !== 'object') {
    throw new Error('Dataset is missing metadata')
  }

  if (
    !Array.isArray(meta.months) ||
    !meta.months.every((month) => typeof month === 'string')
  ) {
    throw new Error('Dataset metadata must contain a valid months array')
  }

  if (!Number.isFinite(meta.grid_deg) || meta.grid_deg <= 0) {
    throw new Error('Dataset must contain a valid grid_deg')
  }

  if (!Array.isArray(cells)) {
    throw new Error('Dataset must contain a cells array')
  }

  const cellIds = new Set()

  for (const cell of cells) {
    if (
      !cell ||
      typeof cell.id !== 'string' ||
      !Number.isFinite(cell.lat) ||
      !Number.isFinite(cell.lon)
    ) {
      throw new Error('Dataset contains an invalid grid cell')
    }

    if (cellIds.has(cell.id)) {
      throw new Error(`Dataset contains duplicate cell ID: ${cell.id}`)
    }

    cellIds.add(cell.id)
  }


  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Dataset must contain a data object')
  }

  // Validate every cell's monthly measurement records.
  for (const [cellId, records] of Object.entries(data)) {
    if (!cellIds.has(cellId)) {
      throw new Error(`Dataset contains data for unknown cell: ${cellId}`)
    }

    if (!Array.isArray(records)) {
      throw new Error(`Data for cell ${cellId} must be an array`)
    }

    for (const record of records) {
      if (!Array.isArray(record) || record.length !== 6) {
        throw new Error(
          `Invalid measurement record for cell ${cellId}: expected 6 values`,
        )
      }

      const [monthIndex, ...measurements] = record

      if (
        !Number.isInteger(monthIndex) ||
        monthIndex < 0 ||
        monthIndex >= meta.months.length
      ) {
        throw new Error(
          `Invalid month index in measurement record for cell ${cellId}`,
        )
      }

      if (
        !measurements.every(
          (value) => Number.isFinite(value) && value >= 0,
        )
      ) {
        throw new Error(
          `Invalid measurement value in record for cell ${cellId}`,
        )
      }
    }
  }

  return dataset
}

/**
 * Decode a response body.
 *
 * Static servers may serve .gz files as raw compressed bytes,
 * so detect the gzip signature before decompressing.
 */
async function decodeDatasetResponse(response) {
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b

  if (!isGzip) {
    return new TextDecoder().decode(bytes)
  }

  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'This browser does not support gzip decompression',
    )
  }

  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))

  return new Response(stream).text()
}

/**
 * Load and validate the FireWatch dataset.
 */
export async function loadDataset({ signal } = {}) {
  const url = `${import.meta.env.BASE_URL}data/firewatch.json.gz`

  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(
      `Failed to load FireWatch dataset: HTTP ${response.status}`,
    )
  }

  const json = await decodeDatasetResponse(response)

  let dataset

  try {
    dataset = JSON.parse(json)
  } catch {
    throw new Error('FireWatch dataset contains invalid JSON')
  }

  return validateDataset(dataset)
}
