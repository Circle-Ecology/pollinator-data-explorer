
import { formatSurveyDate } from '../utils/formatSurveyDate'

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not recorded'
  }

  return value
}

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

  return days === 0
    ? '1 survey day'
    : `${days + 1} calendar days`
}

function formatLocation(city, state) {
  if (!city && !state) return 'Not recorded'
  if (!city) return state
  if (!state) return city

  return `${city}, ${state}`
}

function SiteDetailsPanel({ site }) {
  const tunnels = Array.isArray(site.tunnels)
    ? site.tunnels
    : []

  const generalIds = Array.isArray(site.generalIds)
    ? site.generalIds
    : []

  const summaryItems = [
    {
      label: 'Location',
      value: formatLocation(site.city, site.state),
    },
    {
      label: 'Elevation',
      value:
        site.elevationMeters == null
          ? 'Not recorded'
          : `${site.elevationMeters} meters`,
    },
    {
      label: 'Total tunnels',
      value: formatValue(site.tunnelCount ?? tunnels.length),
    },
    {
      label: 'Total holes',
      value: formatValue(site.holeCount),
    },
    {
      label: 'General IDs',
      value: generalIds.length
        ? generalIds.join(', ')
        : 'Not recorded',
    },
    {
      label: 'Active duration',
      value: formatSiteActivityDuration(
        site.firstSurveyDate,
        site.lastSurveyDate
      ),
    },
  ]

  const cellStyle = {
    padding: '10px 0',
    borderBottom: '1px solid #eee',
    textAlign: 'left',
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Site details: ${site.propertyName}`}
      className="site-details-panel"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '12px',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Site Details</h3>

      <h2>{site.propertyName}</h2>

      {/* Site summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '12px 24px',
          margin: '20px 0',
        }}
      >
        {summaryItems.map(({ label, value }) => (
          <div key={label} style={{ minWidth: 0 }}>
            <div style={{ color: '#666', marginBottom: '4px' }}>
              {label}
            </div>

            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                overflowWrap: 'anywhere',
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <hr style={{ border: 0, borderTop: '1px solid #ddd' }} />

      {/* Consolidated tunnel information */}
      <section aria-label="Tunnel Information">
        <h3>Tunnel Information</h3>

        <div style={{ overflowX: 'auto' }}>
          <table
            aria-label="Tunnel information table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr>
                <th style={cellStyle}>Tunnel ID</th>
                <th style={cellStyle}>Preference</th>
                <th style={cellStyle}>Diameter</th>
              </tr>
            </thead>

            <tbody>
              {tunnels.length > 0 ? (
                tunnels.map((tunnel, index) => (
                  <tr key={`${tunnel.tunnelId}-${index}`}>
                    <td style={cellStyle}>
                      {formatValue(tunnel.tunnelId)}
                    </td>

                    <td style={cellStyle}>
                      {formatValue(tunnel.preference)}
                    </td>

                    <td style={cellStyle}>
                      {tunnel.tunnelDiameterInches == null
                        ? 'Not recorded'
                        : `${tunnel.tunnelDiameterInches} inches`}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={cellStyle}>
                    No tunnel information recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default SiteDetailsPanel
