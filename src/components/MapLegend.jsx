function MapLegend({ counts, trueToScale }) {
  if (!counts || counts.length === 0) {
    return null
  }

  const min = Math.min(...counts)
  const max = Math.max(...counts)

  return (
    <div className="map-legend">
      <div className="map-legend-title">Occupied tunnels</div>
      <div className="map-legend-note">
        {trueToScale ? 'true-to-scale' : 'fixed size — zoom in for true scale'}
      </div>
      <div className="map-legend-row">
        <span className="map-legend-dot" style={{ width: 10, height: 10 }} />
        <span>{min}</span>
      </div>
      <div className="map-legend-row">
        <span className="map-legend-dot" style={{ width: 24, height: 24 }} />
        <span>{max}</span>
      </div>
    </div>
  )
}

export default MapLegend
