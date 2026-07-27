import { prisma } from '~~/server/utils/prisma'
import { requireFinanceeUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { user } = await requireFinanceeUser(event)
  const body = await readBody<{
    sidebarCollapsed?: boolean
    dashboardDefaultView?: 'FINANCIAL' | 'OPERATIONAL'
    lastReportPeriod?: string | null
    lastReportView?: string | null
    lastReportRegime?: 'CASH' | 'COMPETENCE' | null
  }>(event)

  const isValidDashboardDefaultView = body.dashboardDefaultView === 'FINANCIAL' || body.dashboardDefaultView === 'OPERATIONAL'
  const isValidLastReportRegime =
    body.lastReportRegime === null
    || body.lastReportRegime === undefined
    || body.lastReportRegime === 'CASH'
    || body.lastReportRegime === 'COMPETENCE'

  if (
    typeof body.sidebarCollapsed !== 'boolean'
    || !isValidDashboardDefaultView
    || !isValidLastReportRegime
    || (body.lastReportPeriod !== null && body.lastReportPeriod !== undefined && typeof body.lastReportPeriod !== 'string')
    || (body.lastReportView !== null && body.lastReportView !== undefined && typeof body.lastReportView !== 'string')
  ) {
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
      dashboardDefaultView: body.dashboardDefaultView,
      lastReportPeriod: body.lastReportPeriod ?? null,
      lastReportView: body.lastReportView ?? null,
      lastReportRegime: body.lastReportRegime ?? null,
    },
    update: {
      sidebarCollapsed: body.sidebarCollapsed,
      dashboardDefaultView: body.dashboardDefaultView,
      lastReportPeriod: body.lastReportPeriod ?? null,
      lastReportView: body.lastReportView ?? null,
      lastReportRegime: body.lastReportRegime ?? null,
    },
    select: {
      sidebarCollapsed: true,
      dashboardDefaultView: true,
      lastReportPeriod: true,
      lastReportView: true,
      lastReportRegime: true,
    },
  })

  return preferences
})
