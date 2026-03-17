import { percentile } from './stats'
import type { SimulationRequest, SimulationResult, SimulationSummary } from '../types'

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let result = Math.imul(state ^ (state >>> 15), 1 | state)
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function sortedValues(values: Float64Array): number[] {
  return Array.from(values).sort((left, right) => left - right)
}

function probabilityAtOrAbove(sorted: number[], threshold: number): number {
  let left = 0
  let right = sorted.length

  while (left < right) {
    const middle = Math.floor((left + right) / 2)
    if (sorted[middle] < threshold) {
      left = middle + 1
    } else {
      right = middle
    }
  }

  return (sorted.length - left) / sorted.length
}

function summarize(
  sortedFinalValues: number[],
  initialAmount: number,
  monthlyContribution: number,
  monthCount: number,
  targetAmount: number | null,
  profitGoal: number | null,
): SimulationSummary {
  const totalContributions = initialAmount + monthlyContribution * monthCount
  const averageFinalValue =
    sortedFinalValues.reduce((sum, value) => sum + value, 0) / sortedFinalValues.length
  const profitThreshold = profitGoal === null ? null : totalContributions + profitGoal

  return {
    meanFinalValue: averageFinalValue,
    medianFinalValue: percentile(sortedFinalValues, 0.5),
    percentile10: percentile(sortedFinalValues, 0.1),
    percentile25: percentile(sortedFinalValues, 0.25),
    percentile50: percentile(sortedFinalValues, 0.5),
    percentile75: percentile(sortedFinalValues, 0.75),
    percentile90: percentile(sortedFinalValues, 0.9),
    probabilityAboveTarget:
      targetAmount === null ? null : probabilityAtOrAbove(sortedFinalValues, targetAmount),
    probabilityAboveProfitGoal:
      profitThreshold === null ? null : probabilityAtOrAbove(sortedFinalValues, profitThreshold),
    confidenceFloor50: percentile(sortedFinalValues, 0.5),
    confidenceFloor75: percentile(sortedFinalValues, 0.25),
    confidenceFloor90: percentile(sortedFinalValues, 0.1),
    totalContributions,
    averageProfit: averageFinalValue - totalContributions,
  }
}

export function runMonteCarloSimulation(
  request: SimulationRequest,
  onProgress?: (completed: number, total: number) => void,
): SimulationResult {
  const monthCount = Math.max(1, Math.round(request.years * 12))
  const simulationCount = Math.max(1, Math.floor(request.simulationCount))
  const samplePathCount = Math.min(request.samplePathCount, simulationCount)
  const finalValues = new Float64Array(simulationCount)
  const samplePaths = Array.from({ length: samplePathCount }, () =>
    new Array<number>(monthCount + 1).fill(0),
  )
  const nextRandom = createMulberry32(request.seed)
  const chunkSize = 1_000

  for (let simulationIndex = 0; simulationIndex < simulationCount; simulationIndex += 1) {
    let balance = request.initialAmount

    if (simulationIndex < samplePathCount) {
      samplePaths[simulationIndex][0] = balance
    }

    for (let monthIndex = 0; monthIndex < monthCount; monthIndex += 1) {
      const sampledIndex = Math.floor(nextRandom() * request.monthlyReturns.length)
      const sampledReturn = request.monthlyReturns[sampledIndex]

      balance = (balance + request.monthlyContribution) * (1 + sampledReturn)

      if (simulationIndex < samplePathCount) {
        samplePaths[simulationIndex][monthIndex + 1] = balance
      }
    }

    finalValues[simulationIndex] = balance

    const completed = simulationIndex + 1
    if (onProgress && (completed % chunkSize === 0 || completed === simulationCount)) {
      onProgress(completed, simulationCount)
    }
  }

  const sortedFinalValues = sortedValues(finalValues)

  return {
    finalValues,
    samplePaths,
    summary: summarize(
      sortedFinalValues,
      request.initialAmount,
      request.monthlyContribution,
      monthCount,
      request.targetAmount,
      request.profitGoal,
    ),
  }
}
