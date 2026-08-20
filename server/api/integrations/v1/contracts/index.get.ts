import { listIntegrationContracts } from '~~/server/utils/integration-consumer-api'

export default defineEventHandler(async (event) => {
  return await listIntegrationContracts(event)
})
