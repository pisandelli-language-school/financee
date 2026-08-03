import { describe, expect, it } from 'vitest'
import { getNotificationContextLabel } from '~/utils/notifications'

describe('notification context labels', () => {
  it('prioritizes contract title with client name when both are available', () => {
    expect(getNotificationContextLabel({
      metadata: {
        contractTitle: 'Contrato VIP',
        clientName: 'Pedro Pisandelli',
        description: 'Mensalidade',
      },
    })).toBe('Contrato VIP · Pedro Pisandelli')
  })

  it('uses description with contact name for financial-entry notifications', () => {
    expect(getNotificationContextLabel({
      metadata: {
        description: 'Mensalidade Agosto',
        contactName: 'Hatus Rodrigues',
      },
    })).toBe('Mensalidade Agosto · Hatus Rodrigues')
  })

  it('falls back to description when no richer context is present', () => {
    expect(getNotificationContextLabel({
      metadata: {
        description: 'Fechamento financeiro',
      },
    })).toBe('Fechamento financeiro')
  })

  it('formats month-based contexts for report notifications', () => {
    expect(getNotificationContextLabel({
      metadata: {
        month: 'Julho de 2026',
      },
    })).toBe('Período Julho de 2026')
  })

  it('returns null when metadata does not expose a known context', () => {
    expect(getNotificationContextLabel({
      metadata: {
        unknown: 'value',
      },
    })).toBeNull()
  })
})
