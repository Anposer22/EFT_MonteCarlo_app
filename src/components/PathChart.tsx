import { formatCompactCurrency } from '../lib/format'

interface PathChartProps {
  samplePaths: number[][]
  years: number
  visiblePathCount: number
}

const WIDTH = 760
const HEIGHT = 340
const PADDING = { top: 20, right: 24, bottom: 58, left: 82 }
const Y_TICK_COUNT = 5

const STROKES = ['#005f73', '#0a9396', '#94d2bd', '#ee9b00', '#ca6702', '#bb3e03', '#9b2226', '#6c757d', '#3a86ff', '#8338ec', '#fb5607', '#2a9d8f']

function toPath(points: number[][]): string {
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ')
}

export function PathChart({ samplePaths, years, visiblePathCount }: PathChartProps) {
  if (samplePaths.length === 0) {
    return <div className="chart-empty">Ejecuta una simulacion para ver trayectorias.</div>
  }

  const visiblePaths = samplePaths.slice(0, Math.max(1, visiblePathCount))
  const monthCount = visiblePaths[0].length - 1
  const chartHeight = HEIGHT - PADDING.top - PADDING.bottom
  const chartWidth = WIDTH - PADDING.left - PADDING.right
  const allValues = visiblePaths.flat()
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const valueRange = Math.max(maxValue - minValue, 1)
  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, index) => {
    const ratio = index / (Y_TICK_COUNT - 1)
    return maxValue - valueRange * ratio
  })
  const xTicks = [0, 0.25, 0.5, 0.75, 1]

  const scaleX = (monthIndex: number) => PADDING.left + (monthIndex / monthCount) * chartWidth
  const scaleY = (value: number) =>
    PADDING.top + chartHeight - ((value - minValue) / valueRange) * chartHeight

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart-svg" role="img">
        <title>Trayectorias de cartera</title>
        {yTicks.map((tick) => {
          const y = scaleY(tick)
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
                {formatCompactCurrency(tick)}
              </text>
            </g>
          )
        })}
        {xTicks.map((tick) => {
          const x = PADDING.left + tick * chartWidth
          return (
            <g key={tick}>
              <line
                x1={x}
                x2={x}
                y1={PADDING.top}
                y2={HEIGHT - PADDING.bottom}
                className="chart-gridline chart-gridline-vertical"
              />
              <text x={x} y={HEIGHT - 30} textAnchor="middle" className="chart-label">
                {tick === 0 ? '0' : `${(years * tick).toFixed(0)}`}
              </text>
            </g>
          )
        })}
        {visiblePaths.map((path, index) => {
          const points = path.map((value, monthIndex) => [scaleX(monthIndex), scaleY(value)])
          return (
            <path
              key={`${index}-${path.length}`}
              d={toPath(points)}
              fill="none"
              stroke={STROKES[index % STROKES.length]}
              strokeWidth={2.2}
              strokeLinecap="round"
              opacity={0.92 - index * 0.04}
            />
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
        <text
          x={PADDING.left + chartWidth / 2}
          y={HEIGHT - 10}
          textAnchor="middle"
          className="chart-axis-title"
        >
          Anos transcurridos
        </text>
        <text
          x={22}
          y={PADDING.top + chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 22 ${PADDING.top + chartHeight / 2})`}
          className="chart-axis-title"
        >
          Valor de la cartera
        </text>
      </svg>
    </div>
  )
}
