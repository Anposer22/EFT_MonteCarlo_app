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
  visiblePathCount: 6,
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
        setDatasetError(
          error instanceof Error ? error.message : 'No se ha podido cargar el dataset.',
        )
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
    () => buildHistogram(dataset?.monthlyReturns ?? [], 36),
    [dataset],
  )

  const resultHistogram = useMemo(
    () =>
      simulationResult ? buildHistogram(Array.from(simulationResult.finalValues), 32) : [],
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
      samplePathCount: Math.min(24, Math.max(1, Math.round(inputs.visiblePathCount))),
      seed: 20260317,
    }

    workerRef.current.postMessage(request)
  }

  return (
    <div className="app-shell">
      <main className="page">
        <section className="hero-panel">
          <article className="hero-copy">
            <div className="eyebrow">Planificador Monte Carlo para ETF</div>
            <h1 className="hero-title">
              Explora el rango de resultados de una <span>estrategia sobre el S&amp;P 500</span>.
            </h1>
            <p>
              Esta app funciona totalmente en el navegador, usa un modelo historico mensual fijo
              y ejecuta las simulaciones Monte Carlo en un Web Worker para mantener la interfaz
              fluida incluso con miles de escenarios.
            </p>
            <div className="hero-stats">
              <div className="hero-stat">
                <span>Ventana historica</span>
                <strong>
                  {dataset
                    ? `${dataset.dateRange.start} a ${dataset.dateRange.end}`
                    : 'Cargando...'}
                </strong>
              </div>
              <div className="hero-stat">
                <span>Limite de simulaciones</span>
                <strong>50.000 ejecuciones</strong>
              </div>
              <div className="hero-stat">
                <span>Frecuencia del modelo</span>
                <strong>Rendimientos mensuales</strong>
              </div>
            </div>
          </article>

          <aside className="hero-side">
            <h2>Como funciona el modelo</h2>
            <p>
              Cada simulacion toma meses historicos al azar, suma tu aportacion mensual y
              capitaliza la cartera. Solo se guardan los resultados que de verdad necesitamos
              para el informe, de modo que el rendimiento sigue siendo bueno con cargas altas.
            </p>
            <div className="notes-list">
              <div className="note-card">
                <div className="table-muted">Motor</div>
                <strong>Typed arrays + Web Worker</strong>
              </div>
              <div className="note-card">
                <div className="table-muted">Analisis</div>
                <strong>Percentiles, objetivos y suelos de confianza</strong>
              </div>
              <div className="note-card">
                <div className="table-muted">Hosting</div>
                <strong>GitHub Pages estatico</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="section-block">
          <div className="section-header">
            <div>
              <h2>Entradas</h2>
              <p>Define el capital inicial, la aportacion mensual, el plazo y el tamano de la simulacion.</p>
            </div>
          </div>

          <div className="inputs-grid">
            <div className="input-card">
              <label htmlFor="initialAmount">Capital inicial (€)</label>
              <input
                id="initialAmount"
                type="number"
                min="0"
                value={inputs.initialAmount}
                onChange={(event) => updateInput('initialAmount', Number(event.target.value))}
              />
            </div>
            <div className="input-card">
              <label htmlFor="monthlyContribution">Aportacion mensual (€)</label>
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
              <label htmlFor="years">Horizonte de inversion (anos)</label>
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
              <label htmlFor="simulationCount">Numero de simulaciones</label>
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
              <label htmlFor="targetAmount">Objetivo final opcional (€)</label>
              <input
                id="targetAmount"
                type="number"
                min="0"
                value={inputs.targetAmount}
                onChange={(event) => updateInput('targetAmount', Number(event.target.value))}
              />
            </div>
            <div className="input-card">
              <label htmlFor="profitGoal">Beneficio objetivo opcional (€)</label>
              <input
                id="profitGoal"
                type="number"
                min="0"
                value={inputs.profitGoal}
                onChange={(event) => updateInput('profitGoal', Number(event.target.value))}
              />
            </div>
            <div className="input-card">
              <label htmlFor="visiblePathCount">Trayectorias a visualizar</label>
              <input
                id="visiblePathCount"
                type="number"
                min="1"
                max="24"
                value={inputs.visiblePathCount}
                onChange={(event) =>
                  updateInput('visiblePathCount', Number(event.target.value))
                }
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
              {isRunning ? 'Ejecutando simulaciones...' : 'Ejecutar simulacion'}
            </button>
            <div className="range-hint">
              Preparado para hasta {formatCount(50_000)} simulaciones en el navegador.
            </div>
          </div>

          {isRunning ? (
            <div className="loading-card section-block">
              <h3>Progreso de la simulacion</h3>
              <p className="note-text">
                El motor Monte Carlo esta corriendo en un Web Worker para que la pagina siga respondiendo.
              </p>
              <div className="progress" style={{ marginTop: '16px' }}>
                <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="table-muted" style={{ marginTop: '10px' }}>
                {formatPercent(progress)} completado
              </p>
            </div>
          ) : null}
          {simulationError ? <p className="note-text">{simulationError}</p> : null}
        </section>

        <section className="section-block">
          <div className="section-header">
            <div>
              <h2>Distribucion historica</h2>
              <p>
                La simulacion parte de la distribucion historica de rendimientos mensuales mostrada aqui.
              </p>
            </div>
            {dataset ? (
              <a className="source-link" href={dataset.sourceUrl} target="_blank" rel="noreferrer">
                Ver fuente de datos
              </a>
            ) : null}
          </div>

          {datasetError ? <p className="note-text">{datasetError}</p> : null}
          {dataset ? (
            <>
              <div className="report-grid">
                <div className="metric-card">
                  <span>Rentabilidad anualizada</span>
                  <strong>{formatPercent(dataset.distributionStats.geometricAnnualReturn)}</strong>
                </div>
                <div className="metric-card">
                  <span>Volatilidad anualizada</span>
                  <strong>{formatPercent(dataset.distributionStats.annualizedVolatility)}</strong>
                </div>
                <div className="metric-card">
                  <span>Mes mediano</span>
                  <strong>{formatSignedPercent(dataset.distributionStats.median)}</strong>
                </div>
                <div className="metric-card">
                  <span>Sesgo</span>
                  <strong>{dataset.distributionStats.skewness.toFixed(2)}</strong>
                </div>
              </div>

              <div className="chart-panel section-block">
                <h3>Histograma de rendimientos mensuales</h3>
                <p className="note-text">{describeSkew(dataset.distributionStats.skewness)}</p>
                <HistogramChart
                  bins={historicalHistogram}
                  valueFormatter={formatSignedPercent}
                  valueKind="percent"
                  xAxisLabel="Rango de rendimiento mensual"
                  yAxisLabel="Probabilidad historica"
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
              <h2>Informe final</h2>
              <p>
                Percentiles, probabilidades de objetivo y trayectorias estimadas para la configuracion actual.
              </p>
            </div>
          </div>

          {simulationResult ? (
            <>
              <div className="report-grid">
                <div className="metric-card">
                  <span>Valor final esperado</span>
                  <strong>{formatCurrency(simulationResult.summary.meanFinalValue)}</strong>
                </div>
                <div className="metric-card">
                  <span>Valor final mediano</span>
                  <strong>{formatCurrency(simulationResult.summary.medianFinalValue)}</strong>
                </div>
                <div className="metric-card">
                  <span>Total aportado</span>
                  <strong>{formatCurrency(simulationResult.summary.totalContributions)}</strong>
                </div>
                <div className="metric-card">
                  <span>Beneficio medio</span>
                  <strong>{formatCurrency(simulationResult.summary.averageProfit)}</strong>
                </div>
              </div>

              <div className="chart-grid section-block">
                <div className="chart-panel">
                  <h3>Distribucion del valor final</h3>
                  <p className="note-text">
                    Este histograma muestra la frecuencia con la que aparece cada rango de valor final.
                  </p>
                  <HistogramChart
                    bins={resultHistogram}
                    valueKind="currency"
                    xAxisLabel="Valor final de la cartera"
                    yAxisLabel="Probabilidad simulada"
                  />
                </div>

                <div className="chart-panel">
                  <h3>Trayectorias de cartera de ejemplo</h3>
                  <p className="note-text">
                    Se muestran las primeras {formatCount(inputs.visiblePathCount)} trayectorias simuladas para visualizar la evolucion posible.
                  </p>
                  <PathChart
                    samplePaths={simulationResult.samplePaths}
                    years={inputs.years}
                    visiblePathCount={inputs.visiblePathCount}
                  />
                </div>
              </div>

              <div className="chart-grid section-block">
                <div className="table-card">
                  <h3>Tabla de percentiles</h3>
                  <table className="table-layout">
                    <tbody>
                      <tr>
                        <td>Percentil 10</td>
                        <td>{formatCurrency(simulationResult.summary.percentile10)}</td>
                      </tr>
                      <tr>
                        <td>Percentil 25</td>
                        <td>{formatCurrency(simulationResult.summary.percentile25)}</td>
                      </tr>
                      <tr>
                        <td>Percentil 50</td>
                        <td>{formatCurrency(simulationResult.summary.percentile50)}</td>
                      </tr>
                      <tr>
                        <td>Percentil 75</td>
                        <td>{formatCurrency(simulationResult.summary.percentile75)}</td>
                      </tr>
                      <tr>
                        <td>Percentil 90</td>
                        <td>{formatCurrency(simulationResult.summary.percentile90)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="insight-grid">
                  <div className="insight-card">
                    <h3>Probabilidad de alcanzar el objetivo</h3>
                    <p className="note-text">
                      Probabilidad de terminar por encima del objetivo final que hayas marcado.
                    </p>
                    <span className="insight-value">
                      {simulationResult.summary.probabilityAboveTarget === null
                        ? 'N/D'
                        : formatPercent(simulationResult.summary.probabilityAboveTarget)}
                    </span>
                  </div>
                  <div className="insight-card">
                    <h3>Probabilidad de lograr el beneficio deseado</h3>
                    <p className="note-text">
                      Probabilidad de ganar al menos el beneficio objetivo sobre lo aportado.
                    </p>
                    <span className="insight-value">
                      {simulationResult.summary.probabilityAboveProfitGoal === null
                        ? 'N/D'
                        : formatPercent(simulationResult.summary.probabilityAboveProfitGoal)}
                    </span>
                  </div>
                  <div className="insight-card">
                    <h3>Suelo con 90% de confianza</h3>
                    <p className="note-text">
                      Con un 90% de exito, la cartera terminaria al menos en este nivel.
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
              <h3>Esperando una simulacion</h3>
              <p className="note-text">
                El informe aparecera aqui cuando ejecutes la simulacion con tus parametros.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
