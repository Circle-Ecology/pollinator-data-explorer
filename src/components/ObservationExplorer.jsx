
import { useEffect, useState } from 'react'
import SiteDetailsPanel from './SiteDetailsPanel'

function ObservationExplorer({
  site,
  markerSelectionCount = 0,
  onCloseDetails,
}) {
  // The selection count at which the user closed the panel. Selecting a marker
  // bumps the count, which reopens the panel (even for the same site).
  const [closedAtSelection, setClosedAtSelection] = useState(null)

  const isClosed = closedAtSelection === markerSelectionCount

  useEffect(() => {
    if (!site || isClosed) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setClosedAtSelection(markerSelectionCount)
        onCloseDetails?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [site, isClosed, markerSelectionCount, onCloseDetails])

  if (!site || isClosed) {
    return null
  }

  const handleClose = () => {
    setClosedAtSelection(markerSelectionCount)
    onCloseDetails?.()
  }

  return (
    <div className="observation-explorer">
      <SiteDetailsPanel site={site} />

      <button
        type="button"
        className="site-details-close"
        aria-label="Close site details"
        onClick={handleClose}
      >
        Close
      </button>
    </div>
  )
}

export default ObservationExplorer
