
export function formatSurveyDate(date) {
  if (typeof date !== 'string') {
    return 'Not recorded'
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)

  if (!match) {
    return 'Not recorded'
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const localDate = new Date(year, month - 1, day)

  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day
  ) {
    return 'Not recorded'
  }

  return localDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatObservationDate(observationDate) {
  return formatSurveyDate(observationDate)
}
