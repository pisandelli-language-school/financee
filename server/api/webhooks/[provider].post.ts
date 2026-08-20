import { receiveIntegrationWebhook } from '~~/server/utils/integration-providers'

export default defineEventHandler(async (event) => {
  const rawPayload = await readRawBody(event, 'utf8')
  const provider = getRouterParam(event, 'provider') || ''
  const headers = getHeaders(event)

  return await receiveIntegrationWebhook(provider, {
    rawPayload: rawPayload ?? '',
    headers,
  })
})
