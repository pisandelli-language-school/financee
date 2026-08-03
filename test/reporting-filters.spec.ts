import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {},
}))

const {
  parseDateRangeFilters,
  parseDelinquencyFilters,
} = await import('~~/server/utils/reporting')

describe('reporting filters parsing', () => {
  beforeEach(() => {
    vi.stubGlobal('createError', (input: { message?: string, statusCode?: number, data?: unknown }) => {
      const error = new Error(input.message ?? 'Erro')

      Object.assign(error, {
        statusCode: input.statusCode,
        data: input.data,
      })

      return error
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses simple date ranges preserving normalized yyyy-mm-dd boundaries', () => {
    const event = {} as Parameters<typeof parseDateRangeFilters>[0]

    vi.stubGlobal('getQuery', () => ({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    }))

    expect(parseDateRangeFilters(event)).toEqual({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })
  })

  it('uses today as default reference date for delinquency filters when it is omitted', () => {
    const event = {} as Parameters<typeof parseDelinquencyFilters>[0]

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:00:00.000Z'))
    vi.stubGlobal('getQuery', () => ({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    }))

    expect(parseDelinquencyFilters(event)).toEqual({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
      referenceDate: '2026-08-03',
    })
  })

  it('rejects inverted date ranges in generic reporting filters', () => {
    const event = {} as Parameters<typeof parseDateRangeFilters>[0]

    vi.stubGlobal('getQuery', () => ({
      dateFrom: '2026-08-01',
      dateTo: '2026-07-01',
    }))

    expect(() => parseDateRangeFilters(event)).toThrowError('A data inicial deve ser menor ou igual à data final.')
  })
})
