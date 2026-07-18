import {
  deleteSection,
  getSectionItem,
  handleBackofficeInfrastructureError,
  updateSection,
} from '~~/server/utils/backoffice'
import { requireFinanceeUser, requirePermission } from '~~/server/utils/auth'

const sectionModuleMap: Record<string, string> = {
  'categorias': 'categorias',
  'contas-carteiras': 'contas',
  'centros-custo': 'centros-custo',
  'tags': 'tags',
  'contatos': 'contatos',
  'formas-pagamento': 'formas-pagamento',
  'dias-nao-uteis': 'dias-nao-uteis',
}

export default defineEventHandler(async (event) => {
  try {
    const section = getRouterParam(event, 'section')
    const id = getRouterParam(event, 'id')

    if (!section || !id) {
      throw createError({ statusCode: 404, statusMessage: 'Recurso não encontrado.' })
    }

    const moduleName = sectionModuleMap[section]
    if (moduleName) {
      const action = event.method === 'GET' ? 'view' : event.method === 'PUT' ? 'update' : event.method === 'DELETE' ? 'delete' : null
      if (action) {
        await requirePermission(event, `${moduleName}.${action}`)
      } else {
        await requireFinanceeUser(event)
      }
    } else {
      await requireFinanceeUser(event)
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
