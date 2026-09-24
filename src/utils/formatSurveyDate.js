export function formatSurveyDate(date) {
  if (!date) {
    return 'Not recorded'
  }

  const [year, month, day] = date.split('-').map(Number)

  const localDate = new Date(year, month - 1, day)

  return localDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}