import { describe, expect, it } from 'vitest'
import { runMonteCarloSimulation } from './simulation'

describe('runMonteCarloSimulation', () => {
  it('handles zero-return accumulation deterministically', () => {
    const result = runMonteCarloSimulation({
      initialAmount: 1000,
      monthlyContribution: 100,
      years: 0.25,
      simulationCount: 2,
      monthlyReturns: [0],
      targetAmount: 1200,
      profitGoal: 0,
      samplePathCount: 2,
      seed: 7,
    })

    expect(Array.from(result.finalValues)).toEqual([1300, 1300])
    expect(result.summary.totalContributions).toBe(1300)
    expect(result.summary.probabilityAboveTarget).toBe(1)
  })

  it('uses the provided seed for stable runs', () => {
    const request = {
      initialAmount: 5000,
      monthlyContribution: 300,
      years: 2,
      simulationCount: 10,
      monthlyReturns: [-0.02, 0.01, 0.03],
      targetAmount: 9000,
      profitGoal: 1000,
      samplePathCount: 3,
      seed: 12345,
    }

    const first = runMonteCarloSimulation(request)
    const second = runMonteCarloSimulation(request)

    expect(Array.from(first.finalValues)).toEqual(Array.from(second.finalValues))
    expect(first.samplePaths).toEqual(second.samplePaths)
  })
})
