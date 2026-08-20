import { beforeEach, describe, expect, it, vi } from 'vitest'

const logIntegrationEvent = vi.fn()
vi.mock('~~/server/utils/integrations', () => ({ logIntegrationEvent }))
vi.stubGlobal('createError', (input: { message?: string, statusCode?: number }) => Object.assign(new Error(input.message), input))

const { receiveIntegrationWebhook } = await import('~~/server/utils/integration-providers')

describe('integration webhook gateway', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects providers that were not explicitly configured', async () => {
    await expect(receiveIntegrationWebhook('unknown-provider', { rawPayload: '{}', headers: {} })).rejects.toMatchObject({ statusCode: 404 })
    expect(logIntegrationEvent).not.toHaveBeenCalled()
  })
})
