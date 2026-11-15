import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { FireWatchContext } from './FireWatchContext.js'
import { loadDataset } from './dataset.js'
import {
  aggregateMonthlySeries,
  getSourceSeries,
  selectCellsInBounds,
} from './selection.js'


const INITIAL_SELECTION = {
  aoi: null,
  dateRange: {
    start: '',
    end: '',
  },
  source: 'harmonized',
}

function getInitialSelection(dataset) {
  const [west, south, east, north] = dataset.meta.bbox

  return {
    aoi: { north, south, east, west },
    dateRange: {
      start: dataset.meta.months[0],
      end: dataset.meta.months[dataset.meta.months.length - 1],
    },
    source: 'harmonized',
  }
}

export function FireWatchProvider({ children }) {
  const [dataset, setDataset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selection, setSelection] = useState(INITIAL_SELECTION)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchDataset() {
      setLoading(true)
      setError(null)

      try {
        const result = await loadDataset({
          signal: controller.signal,
        })

        if (controller.signal.aborted) return

        setDataset(result)
        setSelection(getInitialSelection(result))
      } catch (err) {
        if (err.name === 'AbortError') return

        setError(err instanceof Error ? err.message : 'Failed to load dataset')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchDataset()

    return () => controller.abort()
  }, [reloadKey])

  const selectedCells = useMemo(() => {
    if (!dataset || !selection.aoi) return []

    return selectCellsInBounds(
      dataset.cells,
      selection.aoi,
      dataset.meta.grid_deg,
    )
  }, [dataset, selection.aoi])

  const monthlySeries = useMemo(() => {
    if (!dataset || !selection.dateRange.start || !selection.dateRange.end) {
      return []
    }

    return aggregateMonthlySeries(
      dataset,
      selectedCells.map((cell) => cell.id),
      selection.dateRange,
    )
  }, [dataset, selectedCells, selection.dateRange])

  const sourceSeries = useMemo(
    () => getSourceSeries(monthlySeries, selection.source),
    [monthlySeries, selection.source],
  )

  const setAOI = useCallback((aoi) => {
    setSelection((current) => ({
      ...current,
      aoi,
    }))
  }, [])

  const resetAOI = useCallback(() => {
  if (!dataset) return

  const initialSelection = getInitialSelection(dataset)

  setSelection((current) => ({
    ...current,
    aoi: initialSelection.aoi,
  }))
}, [dataset])

  const setDateRange = useCallback((dateRange) => {
    setSelection((current) => ({
      ...current,
      dateRange,
    }))
  }, [])

  const setSource = useCallback((source) => {
    setSelection((current) => ({
      ...current,
      source,
    }))
  }, [])

  const reload = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  const value = useMemo(
    () => ({
      dataset,
      loading,
      error,
      selection,
      selectedCells,
      monthlySeries,
      sourceSeries,
      setAOI,
      setDateRange,
      setSource,
      reload,
      resetAOI,
    }),
    [
      dataset,
      loading,
      error,
      selection,
      selectedCells,
      monthlySeries,
      sourceSeries,
      setAOI,
      setDateRange,
      setSource,
      reload,
      resetAOI,
    ],
  )

  return (
    <FireWatchContext.Provider value={value}>
      {children}
    </FireWatchContext.Provider>
  )
}


