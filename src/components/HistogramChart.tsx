import type { HistogramBin } from '../types'
import { formatCompactCurrency, formatPercent, formatSignedPercent } from '../lib/format'

interface HistogramChartProps {
  bins: HistogramBin[]
  valueFormatter?: (value: number) => string
  valueKind?: 'currency' | 'percent'
  xAxisLabel: string
  yAxisLabel: string
}

const WIDTH = 760
const HEIGHT = 320
const PADDING = { top: 22, right: 18, bottom: 60, left: 78 }
const Y_TICK_COUNT = 5

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
  xAxisLabel,
  yAxisLabel,
}: HistogramChartProps) {
  if (bins.length === 0) {
    return <div className="chart-empty">No hay datos disponibles.</div>
  }

  const chartHeight = HEIGHT - PADDING.top - PADDING.bottom
  const chartWidth = WIDTH - PADDING.left - PADDING.right
  const maxProbability = Math.max(...bins.map((bin) => bin.probability), 0.01)
  const barWidth = chartWidth / bins.length
  const formatValue = valueFormatter ?? ((value: number) => defaultFormatter(value, valueKind))
  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, index) => {
    const ratio = index / (Y_TICK_COUNT - 1)
    return maxProbability * (1 - ratio)
  })

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart-svg" role="img">
        <title>Histograma</title>
        {yTicks.map((tick) => {
          const y = PADDING.top + (1 - tick / maxProbability) * chartHeight
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y}
                y2={y}
                className="chart-gridline"
              />
              <text x={PADDING.left - 10} y={y + 4} textAnchor="end" className="chart-label">
                {formatPercent(tick)}
              </text>
            </g>
          )
        })}

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
                {`${formatValue(bin.start)} a ${formatValue(bin.end)}: ${formatPercent(bin.probability)}`}
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
        <line
          x1={PADDING.left}
          x2={PADDING.left}
          y1={PADDING.top}
          y2={HEIGHT - PADDING.bottom}
          className="chart-axis"
        />

        <text x={PADDING.left} y={HEIGHT - 28} className="chart-label">
          {formatValue(bins[0].start)}
        </text>
        <text
          x={PADDING.left + chartWidth / 2}
          y={HEIGHT - 16}
          textAnchor="middle"
          className="chart-axis-title"
        >
          {xAxisLabel}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 28}
          textAnchor="end"
          className="chart-label"
        >
          {formatValue(bins[bins.length - 1].end)}
        </text>
        <text
          x={24}
          y={PADDING.top + chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 24 ${PADDING.top + chartHeight / 2})`}
          className="chart-axis-title"
        >
          {yAxisLabel}
        </text>
      </svg>
    </div>
  )
}
