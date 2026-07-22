import {
  deleteSection,
  getSectionItem,
  handleBackofficeInfrastructureError,
  updateSection,
} from '~~/server/utils/backoffice'
import { requirePermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const section = getRouterParam(event, 'section')
    const id = getRouterParam(event, 'id')

    if (!section || !id) {
      throw createError({ statusCode: 404, statusMessage: 'Recurso não encontrado.' })
    }

    // Map section to RBAC module name
    const moduleName = section === 'contas-carteiras' ? 'contas' : section

    if (event.method === 'GET') {
      await requirePermission(event, `${moduleName}.view`)
      return await getSectionItem(section as never, id)
    }

    if (event.method === 'PUT') {
      await requirePermission(event, `${moduleName}.update`)
      return await updateSection(section as never, id, event)
    }

    if (event.method === 'DELETE') {
      await requirePermission(event, `${moduleName}.delete`)
      return await deleteSection(section as never, id)
    }

    throw createError({ statusCode: 405, statusMessage: 'Método não permitido.' })
  } catch (error) {
    handleBackofficeInfrastructureError(error)
  }
})
