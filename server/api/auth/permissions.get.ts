import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'permissoes.manage')

  const items = await prisma.permission.findMany({
    orderBy: [
      { module: 'asc' },
      { action: 'asc' },
      { key: 'asc' },
    ],
  })

  return items.map(item => ({
    id: item.id,
    key: item.key,
    module: item.module,
    action: item.action,
    description: item.description,
  }))
})
