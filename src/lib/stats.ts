import type { DistributionStats, HistogramBin } from '../types'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const index = clamp(ratio, 0, 1) * (sorted.length - 1)
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  const weight = index - lowerIndex

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex]
  }

  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight
}

export function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0
  }

  const average = mean(values)
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length

  return Math.sqrt(variance)
}

export function skewness(values: number[]): number {
  if (values.length < 3) {
    return 0
  }

  const average = mean(values)
  const deviation = standardDeviation(values)

  if (deviation === 0) {
    return 0
  }

  return (
    values.reduce((sum, value) => sum + ((value - average) / deviation) ** 3, 0) /
    values.length
  )
}

export function geometricAnnualReturn(monthlyReturns: number[]): number {
  if (monthlyReturns.length === 0) {
    return 0
  }

  const growth = monthlyReturns.reduce(
    (product, currentReturn) => product * (1 + currentReturn),
    1,
  )

  return growth ** (12 / monthlyReturns.length) - 1
}

export function buildHistogram(values: number[], binCount = 24): HistogramBin[] {
  if (values.length === 0) {
    return []
  }

  const min = Math.min(...values)
  const max = Math.max(...values)

  if (min === max) {
    return [
      {
        start: min,
        end: max,
        count: values.length,
        probability: 1,
      },
    ]
  }

  const safeBinCount = Math.max(1, binCount)
  const width = (max - min) / safeBinCount
  const counts = new Array<number>(safeBinCount).fill(0)

  for (const value of values) {
    const rawIndex = Math.floor((value - min) / width)
    const index = Math.min(safeBinCount - 1, Math.max(0, rawIndex))
    counts[index] += 1
  }

  return counts.map((count, index) => ({
    start: min + width * index,
    end: min + width * (index + 1),
    count,
    probability: count / values.length,
  }))
}

export function describeSkew(skew: number): string {
  if (skew > 0.35) {
    return 'Right-skewed: upside outliers appear more often than a normal curve would suggest.'
  }

  if (skew < -0.35) {
    return 'Left-skewed: downside shocks are heavier than a normal curve would suggest.'
  }

  return 'Roughly symmetric: the historical shape is fairly balanced around its center.'
}

export function computeDistributionStats(values: number[]): DistributionStats {
  const deviation = standardDeviation(values)

  return {
    mean: mean(values),
    median: percentile(values, 0.5),
    min: Math.min(...values),
    max: Math.max(...values),
    standardDeviation: deviation,
    skewness: skewness(values),
    geometricAnnualReturn: geometricAnnualReturn(values),
    annualizedVolatility: deviation * Math.sqrt(12),
    percentile10: percentile(values, 0.1),
    percentile90: percentile(values, 0.9),
  }
}
