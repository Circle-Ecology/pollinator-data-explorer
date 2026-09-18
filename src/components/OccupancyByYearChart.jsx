import { formatOccupancyRate } from '../utils/formatOccupancyRate'

function OccupancyByYearChart({ yearlyData = [] }) {
  return (
    <div>
      <h3>Occupancy by year</h3>

      {yearlyData.map((item) => (
        <div key={item.year}>
          <span>{item.year}</span>
          <span>
            {formatOccupancyRate(item.occupied, item.total)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default OccupancyByYearChart