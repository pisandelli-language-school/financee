import {
  createSection,
  handleBackofficeInfrastructureError,
  listSection,
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

    if (!section || !sectionToModuleMap[section]) {
      throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada.' })
    }

    const moduleName = sectionToModuleMap[section]

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
