import { formatCompactCurrency } from '../lib/format'

interface PathChartProps {
  samplePaths: number[][]
  years: number
}

const WIDTH = 680
const HEIGHT = 280
const PADDING = { top: 18, right: 18, bottom: 30, left: 20 }

const STROKES = ['#005f73', '#0a9396', '#94d2bd', '#ee9b00', '#ca6702', '#bb3e03']

function toPath(points: number[][]): string {
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ')
}

export function PathChart({ samplePaths, years }: PathChartProps) {
  if (samplePaths.length === 0) {
    return <div className="chart-empty">Run a simulation to see sample paths.</div>
  }

  const monthCount = samplePaths[0].length - 1
  const chartHeight = HEIGHT - PADDING.top - PADDING.bottom
  const chartWidth = WIDTH - PADDING.left - PADDING.right
  const allValues = samplePaths.flat()
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const valueRange = Math.max(maxValue - minValue, 1)

  const scaleX = (monthIndex: number) => PADDING.left + (monthIndex / monthCount) * chartWidth
  const scaleY = (value: number) =>
    PADDING.top + chartHeight - ((value - minValue) / valueRange) * chartHeight

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart-svg" role="img">
        <title>Sample portfolio paths</title>
        {samplePaths.slice(0, 6).map((path, index) => {
          const points = path.map((value, monthIndex) => [scaleX(monthIndex), scaleY(value)])
          return (
            <path
              key={`${index}-${path.length}`}
              d={toPath(points)}
              fill="none"
              stroke={STROKES[index % STROKES.length]}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.9 - index * 0.08}
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
        <text x={PADDING.left} y={HEIGHT - 10} className="chart-label">
          Start
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 10}
          textAnchor="end"
          className="chart-label"
        >
          {`${years} years`}
        </text>
        <text x={PADDING.left} y={PADDING.top - 2} className="chart-label">
          {formatCompactCurrency(maxValue)}
        </text>
        <text x={PADDING.left} y={HEIGHT - PADDING.bottom - 6} className="chart-label">
          {formatCompactCurrency(minValue)}
        </text>
      </svg>
    </div>
  )
}
