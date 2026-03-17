import { describe, expect, it } from 'vitest'
import { buildHistogram, computeDistributionStats, percentile } from './stats'

describe('stats helpers', () => {
  it('calculates percentiles with interpolation', () => {
    expect(percentile([1, 2, 3, 4], 0.25)).toBe(1.75)
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5)
  })

  it('builds a normalized histogram', () => {
    const bins = buildHistogram([1, 2, 3, 4], 2)

    expect(bins).toHaveLength(2)
    expect(bins[0].count + bins[1].count).toBe(4)
    expect(bins[0].probability + bins[1].probability).toBeCloseTo(1)
  })

  it('computes annualized stats', () => {
    const stats = computeDistributionStats([0.01, 0.02, -0.01, 0.03])

    expect(stats.min).toBe(-0.01)
    expect(stats.max).toBe(0.03)
    expect(stats.annualizedVolatility).toBeGreaterThan(0)
  })
})
