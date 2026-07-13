import { requireFinanceeUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { current } = await requireFinanceeUser(event)
  return current
})
