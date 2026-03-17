const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 1,
})

const countFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value)
}

export function formatPercent(value: number): string {
  return percentFormatter.format(value)
}

export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${percentFormatter.format(value)}`
}

export function formatCount(value: number): string {
  return countFormatter.format(value)
}
