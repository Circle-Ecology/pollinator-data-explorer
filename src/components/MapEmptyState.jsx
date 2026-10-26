import { strings } from '../content/strings'

function MapEmptyState() {
  return (
    <div role="status">
      <h2>{strings.mapEmptyTitle}</h2>
      <p>{strings.mapEmptyMessage}</p>
    </div>
  )
}

export default MapEmptyState
