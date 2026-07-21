import {
  deleteSection,
  getSectionItem,
  handleBackofficeInfrastructureError,
  updateSection,
} from '~~/server/utils/backoffice'
import { requirePermission } from '~~/server/utils/auth'

const sectionModuleMap: Record<string, string> = {
  'categorias': 'categorias',
  'contas-carteiras': 'contas',
  'centros-custo': 'centros-custo',
  'tags': 'tags',
  'contatos': 'contatos',
  'formas-pagamento': 'formas-pagamento',
  'dias-nao-uteis': 'dias-nao-uteis',
}

const methodActionMap: Record<string, string> = {
  'GET': 'view',
  'PUT': 'update',
  'DELETE': 'delete',
}

export default defineEventHandler(async (event) => {
  try {
    const section = getRouterParam(event, 'section')
    const id = getRouterParam(event, 'id')

    if (!section || !id) {
      throw createError({ statusCode: 404, statusMessage: 'Recurso não encontrado.' })
    }

    const moduleName = sectionModuleMap[section]
    if (!moduleName) {
      throw createError({ statusCode: 404, statusMessage: 'Seção não suportada.' })
    }

    const action = methodActionMap[event.method]
    if (!action) {
      throw createError({ statusCode: 405, statusMessage: 'Método não permitido.' })
    }

    await requirePermission(event, `${moduleName}.${action}`)

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
