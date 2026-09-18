import { formatSurveyDate } from '../utils/formatSurveyDate'
import { formatOccupancyRate } from '../utils/formatOccupancyRate'
import TaxaBreakdownList from './TaxaBreakdownList'
import SiteStatRow from './SiteStatRow'

function SiteDetailsPanel({ site }) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={site.propertyName}
    >
      <h2>{site.propertyName}</h2>

      <p>
        {site.city}, {site.state}
      </p>

      <SiteStatRow
        label="Elevation"
        value={`${site.elevationMeters} meters`}
      />

      <SiteStatRow
        label="Survey dates"
        value={`${formatSurveyDate(
          site.firstSurveyDate
        )} - ${formatSurveyDate(site.lastSurveyDate)}`}
      />

      <SiteStatRow
        label="Survey visits"
        value={site.surveyDateCount}
      />

      <SiteStatRow
        label="Tunnel count"
        value={site.tunnelCount}
      />

      <SiteStatRow
        label="Occupancy rate"
        value={formatOccupancyRate(
          site.occupiedTunnelCount,
          site.tunnelCount
        )}
      />

      <TaxaBreakdownList taxaCounts={site.taxaCounts || []} />
    </div>
  )
}

export default SiteDetailsPanel