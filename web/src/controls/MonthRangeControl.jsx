import { useMemo } from 'react'
import { getRangePresets, groupMonthsByYear } from './monthRange.js'

/**
 * Constrained month range control with year-grouped options and presets.
 */
export function MonthRangeControl({
  months = [],
  start,
  end,
  onChange,
  source = 'harmonized',
}) {
  const groups = useMemo(() => groupMonthsByYear(months), [months])
  const presets = useMemo(() => getRangePresets(months), [months])

  const activePreset = presets.find(
    (preset) => preset.start === start && preset.end === end,
  )?.id

  const showsViirsGap = source === 'viirs' && start < '2012-01'

  function handleStartChange(event) {
    onChange({ start: event.target.value, end })
  }

  function handleEndChange(event) {
    onChange({ start, end: event.target.value })
  }

  return (
    <div className="range-control">
      <div className="range-fields">
        <label className="field">
          <span>From</span>
          <select value={start} onChange={handleStartChange}>
            {groups.map((group) => (
              <optgroup key={group.year} label={String(group.year)}>
                {group.months.map((month) => (
                  <option
                    key={month.value}
                    value={month.value}
                    disabled={month.value > end}
                  >
                    {month.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="field">
          <span>To</span>
          <select value={end} onChange={handleEndChange}>
            {groups.map((group) => (
              <optgroup key={group.year} label={String(group.year)}>
                {group.months.map((month) => (
                  <option
                    key={month.value}
                    value={month.value}
                    disabled={month.value < start}
                  >
                    {month.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <div
        className="range-presets"
        role="group"
        aria-label="Date range presets"
      >
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`range-preset${activePreset === preset.id ? ' is-active' : ''}`}
            aria-pressed={activePreset === preset.id}
            onClick={() => onChange({ start: preset.start, end: preset.end })}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {showsViirsGap && (
        <p className="range-note">
          Raw VIIRS starts in January 2012. Earlier months show no detection.
        </p>
      )}
    </div>
  )
}
