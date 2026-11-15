import { useEffect, useRef, useState } from 'react'

/**
 * Split download control: CSV table or calendar image.
 */
export function DownloadMenu({
  onDownloadCsv,
  onDownloadPng,
  csvDisabled = false,
  pngDisabled = false,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

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
    const firstItem = menuRef.current?.querySelector(
      '[role="menuitem"]:not(:disabled)',
    )
    firstItem?.focus()
  }, [open])

  function choose(action) {
    setOpen(false)
    triggerRef.current?.focus()
    action?.()
  }

  return (
    <div className="download-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`btn btn-primary download-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Download
        <span className="download-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="download-menu-list"
          role="menu"
          aria-label="Download options"
        >
          <button
            type="button"
            role="menuitem"
            disabled={csvDisabled}
            onClick={() => choose(onDownloadCsv)}
          >
            <span>CSV table</span>
            <small>Cell-month hotspot data</small>
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={pngDisabled}
            onClick={() => choose(onDownloadPng)}
          >
            <span>Calendar image</span>
            <small>PNG snapshot of the calendar</small>
          </button>
        </div>
      )}
    </div>
  )
}
