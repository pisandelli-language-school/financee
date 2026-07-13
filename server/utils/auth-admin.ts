export function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function parsePageSize(value: unknown) {
  const parsed = Number(value)

  if (Number.isNaN(parsed)) {
    return 50
  }

  if (parsed <= 0) {
    return 0
  }

  return Math.min(parsed, 200)
}

export function parsePage(value: unknown) {
  const parsed = Number(value)

  if (Number.isNaN(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}
