import { prisma } from '~~/server/utils/prisma'
import { requireFinanceeUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { user } = await requireFinanceeUser(event)
  const body = await readBody<{ sidebarCollapsed?: boolean }>(event)

  if (typeof body.sidebarCollapsed !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: 'Preferências inválidas.',
    })
  }

  const preferences = await prisma.userPreferences.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      sidebarCollapsed: body.sidebarCollapsed,
    },
    update: {
      sidebarCollapsed: body.sidebarCollapsed,
    },
    select: {
      sidebarCollapsed: true,
    },
  })

  return preferences
})
