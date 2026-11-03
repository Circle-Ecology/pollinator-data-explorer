
import { useEffect, useState } from 'react'
import SiteDetailsPanel from './SiteDetailsPanel'

function ObservationExplorer({
  site,
  markerSelectionCount = 0,
  onCloseDetails,
}) {
  const [closed, setClosed] = useState(false)
  const [closedSelectionCount, setClosedSelectionCount] = useState(null)

  const isClosed =
    closed && closedSelectionCount === markerSelectionCount

  useEffect(() => {
    if (!site || isClosed) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setClosed(true)
        setClosedSelectionCount(markerSelectionCount)
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
    setClosed(true)
    setClosedSelectionCount(markerSelectionCount)
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
