
import { formatSurveyDate } from '../utils/formatSurveyDate'
import SiteStatRow from './SiteStatRow'
import './SiteDetailsPanel.css'

function formatValue(value) {
  return value === null || value === undefined || value === ''
    ? 'Not recorded'
    : value
}

function formatLocation(city, state) {
  return [city, state].filter(
    value => value !== null && value !== undefined && value !== ''
  ).join(', ') || 'Not recorded'
}

function formatActivityDuration(firstDate, lastDate) {
  if (!firstDate || !lastDate) return 'Not recorded'

  const start = new Date(`${firstDate}T00:00:00Z`)
  const end = new Date(`${lastDate}T00:00:00Z`)

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end < start
  ) {
    return 'Not recorded'
  }

  const days = Math.round(
    (end.getTime() - start.getTime()) / 86400000
  )

  return `${days + 1} calendar days`
}

function SiteDetailsPanel({ site }) {
  const total = site.tunnelCount
  const occupied = site.occupiedTunnelCount

  const occupancyRate =
    Number.isFinite(total) &&
    Number.isFinite(occupied) &&
    total > 0
      ? `${Math.round((occupied / total) * 100)}% (${occupied} of ${total})`
      : 'Not recorded'

  const surveyDates =
    site.firstSurveyDate && site.lastSurveyDate
      ? `${formatSurveyDate(site.firstSurveyDate)} - ${formatSurveyDate(site.lastSurveyDate)}`
      : 'Not recorded'

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label={`Site details: ${formatValue(site.propertyName)}`}
      className="site-details-panel"
    >
      <header className="site-details-header">
        <span className="site-details-eyebrow">
          Public Monitoring Site
        </span>
        <h3>Site Details</h3>
        <h2>{formatValue(site.propertyName)}</h2>
        <p>{formatLocation(site.city, site.state)}</p>
      </header>

      <div className="site-details-stats">
        <SiteStatRow
          label="Latitude"
          value={formatValue(site.latitude)}
        />

        <SiteStatRow
          label="Longitude"
          value={formatValue(site.longitude)}
        />

        <SiteStatRow
          label="Elevation"
          value={
            site.elevationMeters == null
              ? 'Not recorded'
              : `${site.elevationMeters} meters`
          }
        />

        <SiteStatRow
          label="Survey visits"
          value={formatValue(site.surveyDateCount)}
        />

        <SiteStatRow
          label="Tunnel count"
          value={formatValue(site.tunnelCount)}
        />

        <SiteStatRow
          label="Occupancy rate"
          value={occupancyRate}
        />
      </div>

      <div className="site-details-survey">
        <h3>Survey activity</h3>

        <SiteStatRow
          label="Survey dates"
          value={surveyDates}
        />

        <SiteStatRow
          label="Site activity duration (survey period)"
          value={formatActivityDuration(
            site.firstSurveyDate,
            site.lastSurveyDate
          )}
        />
      </div>
    </section>
  )
}

export default SiteDetailsPanel
