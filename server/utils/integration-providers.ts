import { logIntegrationEvent } from '~~/server/utils/integrations'

export interface IntegrationWebhookInput {
  rawPayload: string
  headers: Record<string, string | undefined>
}

export interface IntegrationProvider {
  key: string
  validateWebhook(input: IntegrationWebhookInput): Promise<boolean>
  handleWebhook(input: IntegrationWebhookInput): Promise<{ entityType?: string, entityId?: string }>
}

const providers = new Map<string, IntegrationProvider>()

export function registerIntegrationProvider(provider: IntegrationProvider) {
  providers.set(provider.key, provider)
}

export function getIntegrationProvider(providerKey: string) {
  return providers.get(providerKey) ?? null
}

export async function receiveIntegrationWebhook(providerKey: string, input: IntegrationWebhookInput) {
  const provider = getIntegrationProvider(providerKey)

  if (!provider) {
    throw createError({ statusCode: 404, message: 'Provider de webhook não configurado.' })
  }

  const isValid = await provider.validateWebhook(input)

  if (!isValid) {
    await logIntegrationEvent({
      provider: providerKey,
      operation: 'webhook.receive',
      direction: 'INBOUND',
      status: 'FAILED',
      rawPayload: input.rawPayload,
      errorMessage: 'Assinatura de webhook inválida.',
    })
    throw createError({ statusCode: 401, message: 'Assinatura de webhook inválida.' })
  }

  try {
    const result = await provider.handleWebhook(input)
    await logIntegrationEvent({
      provider: providerKey,
      operation: 'webhook.receive',
      direction: 'INBOUND',
      status: 'SUCCESS',
      rawPayload: input.rawPayload,
      entityType: result.entityType ?? null,
      entityId: result.entityId ?? null,
    })
    return { accepted: true }
  } catch (error) {
    await logIntegrationEvent({
      provider: providerKey,
      operation: 'webhook.receive',
      direction: 'INBOUND',
      status: 'FAILED',
      rawPayload: input.rawPayload,
      errorMessage: error instanceof Error ? error.message : 'Falha no processamento do webhook.',
    }).catch(() => undefined)
    throw error
  }
}
