export interface HistogramBin {
  start: number
  end: number
  count: number
  probability: number
}

export interface DistributionStats {
  mean: number
  median: number
  min: number
  max: number
  standardDeviation: number
  skewness: number
  geometricAnnualReturn: number
  annualizedVolatility: number
  percentile10: number
  percentile90: number
}

export interface HistoricalDataset {
  id: string
  name: string
  symbol: string
  description: string
  sourceLabel: string
  sourceUrl: string
  dateRange: {
    start: string
    end: string
  }
  monthlyReturns: number[]
  monthlyReturnDates: string[]
  distributionStats: DistributionStats
  notes: string[]
}

export interface SimulationRequest {
  initialAmount: number
  monthlyContribution: number
  years: number
  simulationCount: number
  monthlyReturns: number[]
  targetAmount: number | null
  profitGoal: number | null
  samplePathCount: number
  seed: number
}

export interface SimulationSummary {
  meanFinalValue: number
  medianFinalValue: number
  percentile10: number
  percentile25: number
  percentile50: number
  percentile75: number
  percentile90: number
  probabilityAboveTarget: number | null
  probabilityAboveProfitGoal: number | null
  confidenceFloor50: number
  confidenceFloor75: number
  confidenceFloor90: number
  totalContributions: number
  averageProfit: number
}

export interface SimulationResult {
  finalValues: Float64Array
  samplePaths: number[][]
  summary: SimulationSummary
}

export type WorkerMessage =
  | { type: 'progress'; completed: number; total: number }
  | { type: 'result'; result: SimulationResult }
  | { type: 'error'; message: string }
