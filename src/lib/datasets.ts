import { computeDistributionStats } from './stats'
import type { HistoricalDataset } from '../types'

interface CsvRow {
  date: string
  price: number
  dividend: number
}

const START_DATE = '1994-01-01'
const END_DATE = '2022-12-01'

function parseCsv(text: string): CsvRow[] {
  return text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(','))
    .map((columns) => ({
      date: columns[0],
      price: Number(columns[1]),
      dividend: Number(columns[2]),
    }))
    .filter(
      (row) =>
        row.date >= START_DATE &&
        row.date <= END_DATE &&
        Number.isFinite(row.price) &&
        Number.isFinite(row.dividend),
    )
}

export async function loadHistoricalDataset(): Promise<HistoricalDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/sp500-shiller.csv`)

  if (!response.ok) {
    throw new Error('No se ha podido cargar el conjunto historico.')
  }

  const rows = parseCsv(await response.text())

  if (rows.length < 2) {
    throw new Error('El conjunto historico es demasiado corto para simular.')
  }

  const monthlyReturns: number[] = []
  const monthlyReturnDates: string[] = []

  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]
    const current = rows[index]
    const monthlyDividend = current.dividend / 12
    const totalReturn = (current.price + monthlyDividend) / previous.price - 1

    monthlyReturns.push(totalReturn)
    monthlyReturnDates.push(current.date)
  }

  return {
    id: 'sp500-shiller',
    name: 'Modelo historico de rentabilidad del S&P 500',
    symbol: 'S&P 500',
    description:
      'Distribucion mensual de rendimientos derivada de la serie del S&P 500 tipo Shiller, usando variacion del precio mas una aproximacion simple del dividendo mensual.',
    sourceLabel: 'Replica del dataset Shiller del S&P 500 (GitHub datasets/s-and-p-500)',
    sourceUrl: 'https://github.com/datasets/s-and-p-500',
    dateRange: {
      start: monthlyReturnDates[0],
      end: monthlyReturnDates[monthlyReturnDates.length - 1],
    },
    monthlyReturns,
    monthlyReturnDates,
    distributionStats: computeDistributionStats(monthlyReturns),
    notes: [
      'El motor toma muestras de rendimientos mensuales historicos con reemplazo.',
      'Los dividendos se aproximan como una doceava parte del dividendo anual en cada mes.',
      'El dataset incluido queda fijado para mantener reproducibilidad y despliegue estatico en GitHub Pages.',
    ],
  }
}
