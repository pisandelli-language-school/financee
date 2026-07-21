import {
  createSection,
  handleBackofficeInfrastructureError,
  listSection,
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
  'POST': 'create',
}

export default defineEventHandler(async (event) => {
  try {
    const section = getRouterParam(event, 'section')

    if (!section) {
      throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada.' })
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
