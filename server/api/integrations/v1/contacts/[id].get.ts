import { getIntegrationContact } from '~~/server/utils/integration-consumer-api'

export default defineEventHandler(async (event) => {
  return await getIntegrationContact(event, getRouterParam(event, 'id') || '')
})
