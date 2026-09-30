import { useCallback, useEffect, useState } from 'react'
import { fetchSites } from '../api/fetchSites'
import ExplorerErrorState from './ExplorerErrorState'

function EmbedPage({ loadSites = fetchSites }) {
  const [state, setState] = useState({ status: 'loading' })

  const load = useCallback(() => {
    setState({ status: 'loading' })
    loadSites()
      .then((sites) => setState({ status: 'ready', sites }))
      .catch(() => setState({ status: 'error' }))
  }, [loadSites])

  useEffect(() => {
    load()
  }, [load])

  if (state.status === 'error') {
    return <ExplorerErrorState onRetry={load} />
  }

  if (state.status === 'loading') {
    return <p role="status">Loading pollinator data…</p>
  }

  return (
    <div data-testid="explorer-map">
      {/* map + charts mount here once those stories land */}
    </div>
  )
}

export default EmbedPage