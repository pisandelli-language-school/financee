import type { ContactNature } from '~/types/backoffice'

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function sanitizeCnpj(value: string) {
  const normalized = value.toUpperCase().replace(/[^0-9A-Z]/g, '')
  const base = normalized.slice(0, 12)
  const checkDigits = normalized.slice(12).replace(/\D/g, '').slice(0, 2)
  return `${base}${checkDigits}`
}

export function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11)

  if (digits.length <= 2) {
    return digits ? `(${digits}` : ''
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatCnpj(value: string) {
  const normalized = sanitizeCnpj(value)

  if (normalized.length <= 2) {
    return normalized
  }

  if (normalized.length <= 5) {
    return `${normalized.slice(0, 2)}.${normalized.slice(2)}`
  }

  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5)}`
  }

  if (normalized.length <= 12) {
    return `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5, 8)}/${normalized.slice(8)}`
  }

  return `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5, 8)}/${normalized.slice(8, 12)}-${normalized.slice(12)}`
}

export function formatPostalCode(value: string) {
  const digits = onlyDigits(value).slice(0, 8)

  if (digits.length <= 5) {
    return digits
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatDocument(value: string, nature: ContactNature) {
  if (nature === 'INDIVIDUAL') {
    return formatCpf(value)
  }

  if (nature === 'COMPANY') {
    return formatCnpj(value)
  }

  return value.toUpperCase().replace(/\s+/g, ' ').trimStart()
}
