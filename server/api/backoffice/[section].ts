import {
  createSection,
  handleBackofficeInfrastructureError,
  listSection,
} from '~~/server/utils/backoffice'
import { requireSupabaseUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await requireSupabaseUser(event)

    const section = getRouterParam(event, 'section')

    if (!section) {
      throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada.' })
    }

    if (event.method === 'GET') {
      return await listSection(section as never, event)
    }

    if (event.method === 'POST') {
      return await createSection(section as never, event)
    }

    throw createError({ statusCode: 405, statusMessage: 'Método não permitido.' })
  } catch (error) {
    handleBackofficeInfrastructureError(error)
  }
})
