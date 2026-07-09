import {
  deleteSection,
  getSectionItem,
  handleBackofficeInfrastructureError,
  updateSection,
} from '~~/server/utils/backoffice'
import { requireSupabaseUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await requireSupabaseUser(event)

    const section = getRouterParam(event, 'section')
    const id = getRouterParam(event, 'id')

    if (!section || !id) {
      throw createError({ statusCode: 404, statusMessage: 'Recurso não encontrado.' })
    }

    if (event.method === 'GET') {
      return await getSectionItem(section as never, id)
    }

    if (event.method === 'PUT') {
      return await updateSection(section as never, id, event)
    }

    if (event.method === 'DELETE') {
      return await deleteSection(section as never, id)
    }

    throw createError({ statusCode: 405, statusMessage: 'Método não permitido.' })
  } catch (error) {
    handleBackofficeInfrastructureError(error)
  }
})
