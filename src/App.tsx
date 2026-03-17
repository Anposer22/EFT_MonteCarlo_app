import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { HistogramChart } from './components/HistogramChart'
import { PathChart } from './components/PathChart'
import { loadHistoricalDataset } from './lib/datasets'
import {
  formatCount,
  formatCurrency,
  formatPercent,
  formatSignedPercent,
} from './lib/format'
import { buildHistogram, describeSkew } from './lib/stats'
import type {
  HistoricalDataset,
  SimulationRequest,
  SimulationResult,
  WorkerMessage,
} from './types'

const DEFAULT_INPUTS = {
  initialAmount: 25_000,
  monthlyContribution: 600,
  years: 20,
  simulationCount: 20_000,
  targetAmount: 500_000,
  profitGoal: 250_000,
}

function App() {
  const workerRef = useRef<Worker | null>(null)
  const [dataset, setDataset] = useState<HistoricalDataset | null>(null)
  const [datasetError, setDatasetError] = useState<string | null>(null)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [simulationError, setSimulationError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)

  useEffect(() => {
    void loadHistoricalDataset()
      .then((loadedDataset) => {
        setDataset(loadedDataset)
      })
      .catch((error) => {
        setDatasetError(error instanceof Error ? error.message : 'Failed to load the dataset.')
      })
  }, [])

  useEffect(() => {
    const worker = new Worker(new URL('./workers/monteCarlo.worker.ts', import.meta.url), {
      type: 'module',
    })

    workerRef.current = worker
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data.type === 'progress') {
        setProgress(event.data.completed / event.data.total)
        return
      }

      if (event.data.type === 'result') {
        setSimulationResult(event.data.result)
        setIsRunning(false)
        setProgress(1)
        return
      }

      setSimulationError(event.data.message)
      setIsRunning(false)
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const historicalHistogram = useMemo(
    () => buildHistogram(dataset?.monthlyReturns ?? [], 22),
    [dataset],
  )

  const resultHistogram = useMemo(
    () =>
      simulationResult ? buildHistogram(Array.from(simulationResult.finalValues), 24) : [],
    [simulationResult],
  )

  function updateInput<Key extends keyof typeof DEFAULT_INPUTS>(
    key: Key,
    value: number,
  ): void {
    setInputs((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function runSimulation(): void {
    if (!dataset || !workerRef.current) {
      return
    }

    setIsRunning(true)
    setProgress(0)
    setSimulationError(null)

    const request: SimulationRequest = {
      initialAmount: inputs.initialAmount,
      monthlyContribution: inputs.monthlyContribution,
      years: inputs.years,
      simulationCount: Math.min(50_000, Math.max(100, Math.round(inputs.simulationCount))),
      monthlyReturns: dataset.monthlyReturns,
      targetAmount: inputs.targetAmount > 0 ? inputs.targetAmount : null,
      profitGoal: inputs.profitGoal > 0 ? inputs.profitGoal : null,
      samplePathCount: 24,
      seed: 20260317,
    }

    workerRef.current.postMessage(request)
  }

  return (
    <div className="app-shell">
      <main className="page">
        <section className="hero-panel">
          <article className="hero-copy">
            <div className="eyebrow">ETF Monte Carlo Planner</div>
            <h1 className="hero-title">
              Explore the range of outcomes for a <span>S&amp;P 500 strategy</span>.
            </h1>
            <p>
              This browser-only app uses a fixed historical monthly return model and runs
              Monte Carlo simulations in a Web Worker, so you can test long-term investing
              scenarios without a backend.
            </p>
            <div className="hero-stats">
              <div className="hero-stat">
                <span>Dataset window</span>
                <strong>
                  {dataset
                    ? `${dataset.dateRange.start} to ${dataset.dateRange.end}`
                    : 'Loading...'}
                </strong>
              </div>
              <div className="hero-stat">
                <span>Simulation cap</span>
                <strong>50,000 runs</strong>
              </div>
              <div className="hero-stat">
                <span>Model cadence</span>
                <strong>Monthly returns</strong>
              </div>
            </div>
          </article>

          <aside className="hero-side">
            <h2>How the model works</h2>
            <p>
              Each simulation samples from the committed historical monthly return
              distribution, adds your monthly contribution, compounds the balance, and stores
              only the values needed for reporting so large runs stay efficient.
            </p>
            <div className="notes-list">
              <div className="note-card">
                <div className="table-muted">Engine</div>
                <strong>Typed arrays + worker thread</strong>
              </div>
              <div className="note-card">
                <div className="table-muted">Report</div>
                <strong>Percentiles, targets, confidence floors</strong>
              </div>
              <div className="note-card">
                <div className="table-muted">Hosting</div>
                <strong>Static GitHub Pages</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="section-block">
          <div className="section-header">
            <div>
              <h2>Inputs</h2>
              <p>Set the starting amount, monthly contribution, horizon, and simulation scale.</p>
            </div>
          </div>

          <div className="inputs-grid">
            <div className="input-card">
              <label htmlFor="initialAmount">Initial amount (USD)</label>
              <input
                id="initialAmount"
                type="number"
                min="0"
                value={inputs.initialAmount}
                onChange={(event) => updateInput('initialAmount', Number(event.target.value))}
              />
            </div>
            <div className="input-card">
              <label htmlFor="monthlyContribution">Monthly contribution (USD)</label>
              <input
                id="monthlyContribution"
                type="number"
                min="0"
                value={inputs.monthlyContribution}
                onChange={(event) =>
                  updateInput('monthlyContribution', Number(event.target.value))
                }
              />
            </div>
            <div className="input-card">
              <label htmlFor="years">Investment horizon (years)</label>
              <input
                id="years"
                type="number"
                min="1"
                max="60"
                value={inputs.years}
                onChange={(event) => updateInput('years', Number(event.target.value))}
              />
            </div>
            <div className="input-card">
              <label htmlFor="simulationCount">Monte Carlo runs</label>
              <input
                id="simulationCount"
                type="number"
                min="100"
                max="50000"
                step="100"
                value={inputs.simulationCount}
                onChange={(event) =>
                  updateInput('simulationCount', Number(event.target.value))
                }
              />
            </div>
            <div className="input-card">
              <label htmlFor="targetAmount">Target final amount (optional)</label>
              <input
                id="targetAmount"
                type="number"
                min="0"
                value={inputs.targetAmount}
                onChange={(event) => updateInput('targetAmount', Number(event.target.value))}
              />
            </div>
            <div className="input-card">
              <label htmlFor="profitGoal">Profit goal above contributions (optional)</label>
              <input
                id="profitGoal"
                type="number"
                min="0"
                value={inputs.profitGoal}
                onChange={(event) => updateInput('profitGoal', Number(event.target.value))}
              />
            </div>
          </div>

          <div className="actions-row">
            <button
              type="button"
              className="run-button"
              disabled={isRunning || !dataset}
              onClick={runSimulation}
            >
              {isRunning ? 'Running simulations...' : 'Run simulation'}
            </button>
            <div className="range-hint">
              Efficient for up to {formatCount(50_000)} simulations in-browser.
            </div>
          </div>

          {isRunning ? (
            <div className="loading-card section-block">
              <h3>Simulation progress</h3>
              <p className="note-text">
                The Monte Carlo engine is running in a Web Worker so the page stays responsive.
              </p>
              <div className="progress" style={{ marginTop: '16px' }}>
                <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="table-muted" style={{ marginTop: '10px' }}>
                {formatPercent(progress)} complete
              </p>
            </div>
          ) : null}
          {simulationError ? <p className="note-text">{simulationError}</p> : null}
        </section>

        <section className="section-block">
          <div className="section-header">
            <div>
              <h2>Historical Distribution</h2>
              <p>
                The simulation model samples from the historical monthly return distribution
                shown below.
              </p>
            </div>
            {dataset ? (
              <a className="source-link" href={dataset.sourceUrl} target="_blank" rel="noreferrer">
                Source data
              </a>
            ) : null}
          </div>

          {datasetError ? <p className="note-text">{datasetError}</p> : null}
          {dataset ? (
            <>
              <div className="report-grid">
                <div className="metric-card">
                  <span>Annualized return</span>
                  <strong>{formatPercent(dataset.distributionStats.geometricAnnualReturn)}</strong>
                </div>
                <div className="metric-card">
                  <span>Annualized volatility</span>
                  <strong>{formatPercent(dataset.distributionStats.annualizedVolatility)}</strong>
                </div>
                <div className="metric-card">
                  <span>Median month</span>
                  <strong>{formatSignedPercent(dataset.distributionStats.median)}</strong>
                </div>
                <div className="metric-card">
                  <span>Skew</span>
                  <strong>{dataset.distributionStats.skewness.toFixed(2)}</strong>
                </div>
              </div>

              <div className="chart-panel section-block">
                <h3>Monthly Return Histogram</h3>
                <p className="note-text">{describeSkew(dataset.distributionStats.skewness)}</p>
                <HistogramChart
                  bins={historicalHistogram}
                  valueFormatter={formatSignedPercent}
                  valueKind="percent"
                />
              </div>

              <div className="notes-list">
                {dataset.notes.map((note) => (
                  <div key={note} className="note-card">
                    <div className="note-text">{note}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <section className="section-block">
          <div className="section-header">
            <div>
              <h2>Simulation Report</h2>
              <p>
                Percentiles, probability bands, and a few sample paths for the current input set.
              </p>
            </div>
          </div>

          {simulationResult ? (
            <>
              <div className="report-grid">
                <div className="metric-card">
                  <span>Expected final value</span>
                  <strong>{formatCurrency(simulationResult.summary.meanFinalValue)}</strong>
                </div>
                <div className="metric-card">
                  <span>Median final value</span>
                  <strong>{formatCurrency(simulationResult.summary.medianFinalValue)}</strong>
                </div>
                <div className="metric-card">
                  <span>Total invested</span>
                  <strong>{formatCurrency(simulationResult.summary.totalContributions)}</strong>
                </div>
                <div className="metric-card">
                  <span>Average profit</span>
                  <strong>{formatCurrency(simulationResult.summary.averageProfit)}</strong>
                </div>
              </div>

              <div className="chart-grid section-block">
                <div className="chart-panel">
                  <h3>Final Value Distribution</h3>
                  <p className="note-text">
                    The histogram shows how often each end-value range appears across all runs.
                  </p>
                  <HistogramChart bins={resultHistogram} valueKind="currency" />
                </div>

                <div className="chart-panel">
                  <h3>Sample Portfolio Paths</h3>
                  <p className="note-text">
                    A small subset of simulated paths is shown to illustrate the possible journey.
                  </p>
                  <PathChart samplePaths={simulationResult.samplePaths} years={inputs.years} />
                </div>
              </div>

              <div className="chart-grid section-block">
                <div className="table-card">
                  <h3>Percentile Table</h3>
                  <table className="table-layout">
                    <tbody>
                      <tr>
                        <td>10th percentile</td>
                        <td>{formatCurrency(simulationResult.summary.percentile10)}</td>
                      </tr>
                      <tr>
                        <td>25th percentile</td>
                        <td>{formatCurrency(simulationResult.summary.percentile25)}</td>
                      </tr>
                      <tr>
                        <td>50th percentile</td>
                        <td>{formatCurrency(simulationResult.summary.percentile50)}</td>
                      </tr>
                      <tr>
                        <td>75th percentile</td>
                        <td>{formatCurrency(simulationResult.summary.percentile75)}</td>
                      </tr>
                      <tr>
                        <td>90th percentile</td>
                        <td>{formatCurrency(simulationResult.summary.percentile90)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="insight-grid">
                  <div className="insight-card">
                    <h3>Target hit rate</h3>
                    <p className="note-text">
                      Probability of ending above your selected target amount.
                    </p>
                    <span className="insight-value">
                      {simulationResult.summary.probabilityAboveTarget === null
                        ? 'N/A'
                        : formatPercent(simulationResult.summary.probabilityAboveTarget)}
                    </span>
                  </div>
                  <div className="insight-card">
                    <h3>Profit goal rate</h3>
                    <p className="note-text">
                      Probability of earning at least your selected profit target.
                    </p>
                    <span className="insight-value">
                      {simulationResult.summary.probabilityAboveProfitGoal === null
                        ? 'N/A'
                        : formatPercent(simulationResult.summary.probabilityAboveProfitGoal)}
                    </span>
                  </div>
                  <div className="insight-card">
                    <h3>90% confidence floor</h3>
                    <p className="note-text">
                      With 90% success probability, the portfolio ends at least here.
                    </p>
                    <span className="insight-value">
                      {formatCurrency(simulationResult.summary.confidenceFloor90)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="loading-card">
              <h3>Waiting for a simulation run</h3>
              <p className="note-text">
                The report will appear here once you run the model with your chosen inputs.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
