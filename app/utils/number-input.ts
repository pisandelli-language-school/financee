function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function formatCurrencyInput(value: string | number | null | undefined) {
  if (value == null || value === '') {
    return ''
  }

  const digits = typeof value === 'number'
    ? Math.round(value * 100).toString()
    : onlyDigits(String(value))

  if (!digits) {
    return ''
  }

  const padded = digits.padStart(3, '0')
  const cents = padded.slice(-2)
  const integer = padded.slice(0, -2).replace(/^0+(?=\d)/, '')
  const formattedInteger = (integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${formattedInteger},${cents}`
}

export function parseCurrencyInput(value: unknown) {
  if (value == null || value === '') {
    return null
  }

  const digits = onlyDigits(String(value))

  if (!digits) {
    return null
  }

  return Number(digits) / 100
}

export function parseLocalizedNumber(value: unknown) {
  if (value == null || value === '') {
    return null
  }

  const normalized = String(value).trim()

  if (!normalized) {
    return null
  }

  const cleaned = normalized.replace(/[^\d,.-]/g, '')

  if (!cleaned) {
    return null
  }

  const negative = cleaned.startsWith('-')
  const unsigned = cleaned.replace(/-/g, '')
  const lastComma = unsigned.lastIndexOf(',')
  const lastDot = unsigned.lastIndexOf('.')
  const decimalIndex = Math.max(lastComma, lastDot)

  const normalizedNumber = decimalIndex === -1
    ? unsigned.replace(/[.,]/g, '')
    : `${unsigned.slice(0, decimalIndex).replace(/[.,]/g, '')}.${unsigned.slice(decimalIndex + 1).replace(/[^\d]/g, '')}`

  if (!normalizedNumber || normalizedNumber === '.') {
    return null
  }

  const parsed = Number(`${negative ? '-' : ''}${normalizedNumber}`)
  return Number.isFinite(parsed) ? parsed : null
}

export function sanitizePercentInput(value: unknown) {
  const raw = String(value ?? '')
  const sanitized = raw.replace(/[^\d,.-]/g, '').replace(/\./g, ',')

  if (!sanitized) {
    return ''
  }

  const negative = sanitized.startsWith('-') ? '-' : ''
  const unsigned = sanitized.replace(/-/g, '')
  const [integerPart = '', ...decimalParts] = unsigned.split(',')
  const decimalPart = decimalParts.join('').slice(0, 2)
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '')

  return decimalPart ? `${negative}${normalizedInteger || '0'},${decimalPart}` : `${negative}${normalizedInteger || '0'}`
}
