import { getIntegrationContract } from '~~/server/utils/integration-consumer-api'

export default defineEventHandler(async (event) => {
  return await getIntegrationContract(event, getRouterParam(event, 'id') || '')
})
