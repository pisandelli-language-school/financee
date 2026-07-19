import {
  deleteSection,
  getSectionItem,
  handleBackofficeInfrastructureError,
  updateSection,
} from '~~/server/utils/backoffice'
import { requirePermission } from '~~/server/utils/auth'

const sectionToModuleMap: Record<string, string> = {
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

    const rbacModule = sectionToModuleMap[section]

    if (!rbacModule) {
       throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada.' })
    }

    if (event.method === 'GET') {
      await requirePermission(event, `${rbacModule}.view`)
      return await getSectionItem(section as never, id)
    }

    if (event.method === 'PUT') {
      await requirePermission(event, `${rbacModule}.update`)
      return await updateSection(section as never, id, event)
    }

    if (event.method === 'DELETE') {
      await requirePermission(event, `${rbacModule}.delete`)
      return await deleteSection(section as never, id)
    }

    throw createError({ statusCode: 405, statusMessage: 'Método não permitido.' })
  } catch (error) {
    handleBackofficeInfrastructureError(error)
  }
})
