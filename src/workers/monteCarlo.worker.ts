/// <reference lib="webworker" />

import { runMonteCarloSimulation } from '../lib/simulation'
import type { SimulationRequest, WorkerMessage } from '../types'

declare const self: DedicatedWorkerGlobalScope

self.onmessage = (event: MessageEvent<SimulationRequest>) => {
  try {
    const result = runMonteCarloSimulation(event.data, (completed, total) => {
      const progressMessage: WorkerMessage = { type: 'progress', completed, total }
      self.postMessage(progressMessage)
    })

    const resultMessage: WorkerMessage = { type: 'result', result }
    self.postMessage(resultMessage, [result.finalValues.buffer])
  } catch (error) {
    const errorMessage: WorkerMessage = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Simulation failed.',
    }
    self.postMessage(errorMessage)
  }
}
