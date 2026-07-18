import { createFinancialEntry } from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'lancamentos.create')

  const payload = await readBody(event)

  return await createFinancialEntry(payload)
})
