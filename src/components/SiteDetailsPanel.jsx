
import { formatSurveyDate } from '../utils/formatSurveyDate'
import { formatOccupancyRate } from '../utils/formatOccupancyRate'
import TaxaBreakdownList from './TaxaBreakdownList'

function formatSiteActivityDuration(firstDate, lastDate) {
  if (!firstDate || !lastDate) {
    return 'Not recorded'
  }

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

  if (days === 0) {
    return '1 survey day'
  }

  return `${days + 1} calendar days`
}

function SiteDetailsPanel({ site }) {
  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'Not recorded'
    }

    return value
  }

  const rows = [
    ['City', formatValue(site.city)],
    ['State', formatValue(site.state)],
    [
      'Elevation',
      site.elevationMeters == null
        ? 'Not recorded'
        : `${site.elevationMeters} meters`,
    ],
    [
      'Survey dates',
      `${formatSurveyDate(site.firstSurveyDate)} - ${formatSurveyDate(
        site.lastSurveyDate
      )}`,
    ],
    [
      'Site activity duration (survey period)',
      formatSiteActivityDuration(
        site.firstSurveyDate,
        site.lastSurveyDate
      ),
    ],
    ['Survey visits', formatValue(site.surveyDateCount)],
    ['Tunnel count', formatValue(site.tunnelCount)],
    [
      'Occupancy rate',
      formatOccupancyRate(
        site.occupiedTunnelCount,
        site.tunnelCount
      ),
    ],
  ]

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={site.propertyName}
      className="site-details-panel"
    >
      <h2>{site.propertyName}</h2>

      {/* Existing site information */}
      <div style={{ overflowX: 'auto' }}>
        <table
          aria-label="Site information"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
          }}
        >
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th
                  scope="row"
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #ddd',
                    verticalAlign: 'top',
                  }}
                >
                  {label}:
                </th>
                <td
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #ddd',
                  }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* US-15: Public tunnel details */}
      {Array.isArray(site.tunnels) && site.tunnels.length > 0 && (
        <section aria-label="Tunnel details">
          <h3>Tunnel Details</h3>

          {site.tunnels.map((tunnel, index) => {
            const tunnelRows = [
              ['Direction', tunnel.direction],
              ['Diameter (inches)', tunnel.tunnelDiameterInches],
              ['Installation year', tunnel.installationYear],
              ['Substrate type', tunnel.substrateType],
              ['Sun exposure', tunnel.sunExposure],
              [
                'Coarse woody debris type',
                tunnel.coarseWoodyDebrisType,
              ],
            ]

            return (
              <div
                key={`${tunnel.tunnelId}-${index}`}
                style={{ marginBottom: '20px' }}
              >
                <h4>
                  Tunnel {formatValue(tunnel.tunnelId)}
                </h4>

                <div style={{ overflowX: 'auto' }}>
                  <table
                    aria-label={`Tunnel ${formatValue(tunnel.tunnelId)} information`}
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                    }}
                  >
                    <tbody>
                      {tunnelRows.map(([label, value]) => (
                        <tr key={label}>
                          <th
                            scope="row"
                            style={{
                              padding: '10px',
                              borderBottom: '1px solid #ddd',
                              verticalAlign: 'top',
                            }}
                          >
                            {label}:
                          </th>
                          <td
                            style={{
                              padding: '10px',
                              borderBottom: '1px solid #ddd',
                            }}
                          >
                            {formatValue(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Existing taxa breakdown */}
      <TaxaBreakdownList taxaCounts={site.taxaCounts || []} />
    </div>
  )
}

export default SiteDetailsPanel
