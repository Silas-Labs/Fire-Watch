import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getRangePresets,
  groupMonthsByYear,
  resolveRangeClick,
} from './monthRange.js'

const MONTH_SHORT = [
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

const MONTH_LONG = [
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

function formatMonthLabel(value) {
  if (!value) return ''
  const [year, month] = value.split('-')
  return `${MONTH_SHORT[Number(month) - 1]} ${year}`
}

/**
 * Month-range picker. Opens a calendar of months and only allows months
 * that exist in the dataset.
 */
export function MonthRangeControl({
  months = [],
  start,
  end,
  onChange,
  source = 'harmonized',
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({
    start: start ?? null,
    end: end ?? null,
    selecting: 'done',
  })
  const [viewYear, setViewYear] = useState(() =>
    Number((start || '2000').slice(0, 4)),
  )

  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const pickerRef = useRef(null)

  const earliest = source === 'viirs' ? '2012-01' : null
  const availableMonths = useMemo(
    () => months.filter((month) => !earliest || month >= earliest),
    [months, earliest],
  )
  const groups = useMemo(
    () => groupMonthsByYear(availableMonths),
    [availableMonths],
  )
  const availableSet = useMemo(
    () => new Set(availableMonths),
    [availableMonths],
  )
  const presets = useMemo(
    () => getRangePresets(availableMonths),
    [availableMonths],
  )

  const years = groups.map((group) => group.year)
  const minYear = years[0] ?? null
  const maxYear = years[years.length - 1] ?? null

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const firstAvailable = pickerRef.current?.querySelector(
      '.month-cell:not(:disabled)',
    )
    firstAvailable?.focus()
  }, [open])

  function togglePicker() {
    if (open) {
      setOpen(false)
      return
    }

    const startYear = Number((start || availableMonths[0] || '2000').slice(0, 4))
    const clampedYear = Math.min(
      Math.max(startYear, minYear ?? startYear),
      maxYear ?? startYear,
    )

    setDraft({
      start: start ?? null,
      end: end ?? null,
      selecting: 'done',
    })
    setViewYear(clampedYear)
    setOpen(true)
  }

  function closePicker() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function commit(range) {
    if (!range.start || !range.end) return
    onChange({ start: range.start, end: range.end })
    closePicker()
  }

  function handleMonthClick(value) {
    if (!availableSet.has(value)) return

    const next = resolveRangeClick(draft, value)
    setDraft(next)

    if (next.selecting === 'done') {
      commit(next)
    }
  }

  const label =
    start && end
      ? `${formatMonthLabel(start)} – ${formatMonthLabel(end)}`
      : 'Select a range'

  const rangeSummary = years.length
    ? `${minYear}–${maxYear}`
    : 'no data loaded'

  return (
    <div className="range-control" ref={rootRef}>
      <span className="range-label">Date range</span>

      <button
        ref={triggerRef}
        type="button"
        className={`range-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={togglePicker}
      >
        <span>{label}</span>
        <span className="range-trigger-icon" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={pickerRef}
          className="month-picker"
          role="dialog"
          aria-label="Choose a month range"
        >
          <div className="month-picker-head">
            <button
              type="button"
              className="month-nav"
              onClick={() => setViewYear((year) => Math.max(minYear, year - 1))}
              disabled={viewYear <= minYear}
              aria-label="Previous year"
            >
              ‹
            </button>

            <strong>{viewYear}</strong>

            <button
              type="button"
              className="month-nav"
              onClick={() => setViewYear((year) => Math.min(maxYear, year + 1))}
              disabled={viewYear >= maxYear}
              aria-label="Next year"
            >
              ›
            </button>

            <button
              type="button"
              className="month-picker-close"
              onClick={closePicker}
              aria-label="Close date picker"
            >
              ×
            </button>
          </div>

          <div className="month-grid" role="group" aria-label={`Months in ${viewYear}`}>
            {MONTH_SHORT.map((name, index) => {
              const value = `${viewYear}-${String(index + 1).padStart(2, '0')}`
              const isAvailable = availableSet.has(value)
              const isStart = draft.start === value
              const isEnd = draft.end === value
              const isInRange =
                draft.start &&
                draft.end &&
                value >= draft.start &&
                value <= draft.end

              const classes = ['month-cell']
              if (isStart || isEnd) classes.push('is-edge')
              else if (isInRange) classes.push('is-in-range')

              return (
                <button
                  key={value}
                  type="button"
                  className={classes.join(' ')}
                  disabled={!isAvailable}
                  aria-pressed={isStart || isEnd}
                  aria-label={`${MONTH_LONG[index]} ${viewYear}${
                    isAvailable ? '' : ' (unavailable)'
                  }`}
                  onClick={() => handleMonthClick(value)}
                >
                  {name}
                </button>
              )
            })}
          </div>

          <p className="month-picker-hint">
            {draft.selecting === 'end' && draft.start
              ? 'Now choose the end month.'
              : 'Choose a start month, then an end month.'}
          </p>

          <div className="month-picker-presets">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="range-preset"
                onClick={() => commit({ start: preset.start, end: preset.end })}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <p className="month-picker-footnote">
            Only months in the dataset ({rangeSummary}) are selectable.
          </p>
        </div>
      )}

      {source === 'viirs' && start < '2012-01' && (
        <p className="range-note">
          Raw VIIRS starts in January 2012. Pick a range from 2012 onward.
        </p>
      )}
    </div>
  )
}
