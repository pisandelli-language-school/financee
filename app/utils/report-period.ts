const monthLabelFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

export function endOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0))
}

export function shiftMonth(value: Date, amount: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1))
}

export function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function toMonthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`
}

export function parseMonthKey(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = new Date(`${value}-01T00:00:00.000Z`)
  return Number.isNaN(parsed.valueOf()) ? null : startOfMonth(parsed)
}

export function formatMonthLabel(value: Date) {
  const label = monthLabelFormatter.format(value)
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
}
