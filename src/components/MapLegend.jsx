// US-39: markers are sized by the share of each site's holes that were
// occupied (`percents`), so sites of different sizes compare fairly.
function MapLegend({ percents, trueToScale }) {
  if (!percents || percents.length === 0) {
    return null
  }

  const min = Math.min(...percents)
  const max = Math.max(...percents)

  return (
    <div className="map-legend">
      <div className="map-legend-title">Occupied holes</div>
      <div className="map-legend-note">
        {trueToScale ? 'true-to-scale' : 'fixed size — zoom in for true scale'}
      </div>
      <div className="map-legend-row">
        <span className="map-legend-dot" style={{ width: 10, height: 10 }} />
        <span>{min}%</span>
      </div>
      <div className="map-legend-row">
        <span className="map-legend-dot" style={{ width: 24, height: 24 }} />
        <span>{max}%</span>
      </div>
    </div>
  )
}

export default MapLegend
