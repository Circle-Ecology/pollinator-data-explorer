import { strings } from '../content/strings'

function MapErrorState({ onRetry }) {
  return (
    <div role="alert">
      <h2>{strings.mapErrorTitle}</h2>
      <p>{strings.mapErrorMessage}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          {strings.retryLabel}
        </button>
      )}
    </div>
  )
}

export default MapErrorState
