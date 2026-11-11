import { formatSurveyDate } from '../utils/formatSurveyDate'
import { formatOccupancyRate } from '../utils/formatOccupancyRate'
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

function SiteDetailsPanel({ site }) {
  // Monitoring is ongoing, so the range runs from the first survey to now.
  const surveyDates = site.firstSurveyDate
    ? `${formatSurveyDate(site.firstSurveyDate)} - Current`
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
          value={formatOccupancyRate(
            site.occupiedTunnelCount,
            site.tunnelCount
          )}
        />
      </div>

      <div className="site-details-survey">
        <h3>Survey activity</h3>

        <SiteStatRow
          label="Survey dates"
          value={surveyDates}
        />
      </div>
    </section>
  )
}

export default SiteDetailsPanel
