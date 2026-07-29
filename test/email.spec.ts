import { describe, expect, it } from 'vitest'
import { sendInternalNotificationEmail } from '~~/server/utils/email'

describe('notification e-mail delivery', () => {
  it('fails safely when Resend is not configured', async () => {
    const originalApiKey = process.env.RESEND_API_KEY
    const originalFrom = process.env.RESEND_FROM_EMAIL

    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL

    try {
      await expect(sendInternalNotificationEmail({
        to: 'admin@example.com',
        title: 'Contrato próximo do fim',
        message: 'O contrato de teste termina em breve.',
      })).resolves.toEqual({
        delivered: false,
        reason: 'provider-not-configured',
      })
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.RESEND_API_KEY
      } else {
        process.env.RESEND_API_KEY = originalApiKey
      }

      if (originalFrom === undefined) {
        delete process.env.RESEND_FROM_EMAIL
      } else {
        process.env.RESEND_FROM_EMAIL = originalFrom
      }
    }
  })
})
