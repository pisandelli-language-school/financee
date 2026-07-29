import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cloneAutomationRuleForm } from '~/validators/automation-rule'

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {},
}))

vi.stubGlobal('createError', (input: { message?: string }) => new Error(input.message ?? 'Erro'))

const { parseNotificationsFilters } = await import('~~/server/utils/notifications')

describe('notifications module helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('parses valid list filters and keeps the default page size', () => {
    const filters = parseNotificationsFilters({
      severity: 'WARNING',
      status: 'unread',
      page: '2',
    })

    expect(filters).toEqual({
      severity: 'WARNING',
      status: 'unread',
      page: 2,
      pageSize: 50,
    })
  })

  it('rejects unsupported severities', () => {
    expect(() => parseNotificationsFilters({
      severity: 'ALERT',
    })).toThrow('Severidade inválida.')
  })

  it('rejects unsupported read filters', () => {
    expect(() => parseNotificationsFilters({
      status: 'all',
    })).toThrow('Filtro de leitura inválido.')
  })

  it('clones automation form arrays without preserving the same reference', () => {
    const values = {
      isEnabled: true,
      severity: 'WARNING' as const,
      recipientRoles: ['Admin', 'Financeiro'],
      daysBeforeEnd: 15,
      daysAfterDue: null,
      threshold: null,
      graceDays: null,
    }

    const cloned = cloneAutomationRuleForm(values)

    expect(cloned).toEqual(values)
    expect(cloned.recipientRoles).not.toBe(values.recipientRoles)
  })
})
