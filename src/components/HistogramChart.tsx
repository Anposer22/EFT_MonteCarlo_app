import type { HistogramBin } from '../types'
import { formatCompactCurrency, formatSignedPercent } from '../lib/format'

interface HistogramChartProps {
  bins: HistogramBin[]
  valueFormatter?: (value: number) => string
  valueKind?: 'currency' | 'percent'
}

const WIDTH = 680
const HEIGHT = 240
const PADDING = { top: 16, right: 12, bottom: 34, left: 12 }

function defaultFormatter(value: number, valueKind: 'currency' | 'percent'): string {
  if (valueKind === 'currency') {
    return formatCompactCurrency(value)
  }

  return formatSignedPercent(value)
}

export function HistogramChart({
  bins,
  valueFormatter,
  valueKind = 'currency',
}: HistogramChartProps) {
  if (bins.length === 0) {
    return <div className="chart-empty">No data available.</div>
  }

  const chartHeight = HEIGHT - PADDING.top - PADDING.bottom
  const chartWidth = WIDTH - PADDING.left - PADDING.right
  const maxProbability = Math.max(...bins.map((bin) => bin.probability), 0.01)
  const barWidth = chartWidth / bins.length
  const formatValue = valueFormatter ?? ((value: number) => defaultFormatter(value, valueKind))

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart-svg" role="img">
        <title>Histogram chart</title>
        {bins.map((bin, index) => {
          const barHeight = (bin.probability / maxProbability) * chartHeight
          const x = PADDING.left + index * barWidth
          const y = PADDING.top + (chartHeight - barHeight)

          return (
            <g key={`${bin.start}-${bin.end}`}>
              <rect
                x={x + 1}
                y={y}
                width={Math.max(barWidth - 2, 1)}
                height={barHeight}
                rx={4}
                className="chart-bar"
              />
              <title>
                {`${formatValue(bin.start)} to ${formatValue(bin.end)}: ${(bin.probability * 100).toFixed(1)}%`}
              </title>
            </g>
          )
        })}
        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={HEIGHT - PADDING.bottom}
          y2={HEIGHT - PADDING.bottom}
          className="chart-axis"
        />
        <text x={PADDING.left} y={HEIGHT - 10} className="chart-label">
          {formatValue(bins[0].start)}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 10}
          textAnchor="end"
          className="chart-label"
        >
          {formatValue(bins[bins.length - 1].end)}
        </text>
      </svg>
    </div>
  )
}
