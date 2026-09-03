const monthLabelFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const dateLabelFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

export interface DateRangeValue {
  start: string
  end: string
}

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

export function getMonthDateRange(value: Date): DateRangeValue {
  return {
    start: toDateInput(startOfMonth(value)),
    end: toDateInput(endOfMonth(value)),
  }
}

export function formatDateRangeLabel(range: DateRangeValue) {
  const start = new Date(`${range.start}T00:00:00.000Z`)
  const end = new Date(`${range.end}T00:00:00.000Z`)

  if (start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()) {
    return formatMonthLabel(start)
  }

  return `${dateLabelFormatter.format(start)} – ${dateLabelFormatter.format(end)}`
}
