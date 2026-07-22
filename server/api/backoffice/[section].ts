import {
  createSection,
  handleBackofficeInfrastructureError,
  listSection,
} from '~~/server/utils/backoffice'
import { requirePermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const section = getRouterParam(event, 'section')

    if (!section) {
      throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada.' })
    }

    // Map section to RBAC module name
    const moduleName = section === 'contas-carteiras' ? 'contas' : section

    if (event.method === 'GET') {
      await requirePermission(event, `${moduleName}.view`)
      return await listSection(section as never, event)
    }

    if (event.method === 'POST') {
      await requirePermission(event, `${moduleName}.create`)
      return await createSection(section as never, event)
    }

    throw createError({ statusCode: 405, statusMessage: 'Método não permitido.' })
  } catch (error) {
    handleBackofficeInfrastructureError(error)
  }
})
