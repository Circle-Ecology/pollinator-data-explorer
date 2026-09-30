import { strings } from '../content/strings'

function ExplorerErrorState({ onRetry }) {
  return (
    <div role="alert">
      <h2>{strings.errorTitle}</h2>
      <p>{strings.errorMessage}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          {strings.retryLabel}
        </button>
      )}
    </div>
  )
}

export default ExplorerErrorState