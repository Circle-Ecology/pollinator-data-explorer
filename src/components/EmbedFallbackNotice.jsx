import { strings } from '../content/strings'

function EmbedFallbackNotice({ appUrl = import.meta.env.PUBLIC_APP_URL }) {
  const baseUrl = (appUrl || '').replace(/\/$/, '')

  return (
    <p>
      {strings.fallbackIntro}{' '}
      <a href={`${baseUrl}/embed`}>{strings.fallbackLinkLabel}</a>
    </p>
  )
}

export default EmbedFallbackNotice