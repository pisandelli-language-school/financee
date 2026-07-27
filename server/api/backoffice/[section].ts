import {
  createSection,
  handleBackofficeInfrastructureError,
  listSection,
} from '~~/server/utils/backoffice'
import { requirePermission } from '~~/server/utils/auth'

const sectionPermissionMap = {
  categorias: 'categorias',
  'contas-carteiras': 'contas',
  'instituicoes-financeiras': 'contas',
  'centros-custo': 'centros-custo',
  tags: 'tags',
  contatos: 'contatos',
  'formas-pagamento': 'formas-pagamento',
  'dias-nao-uteis': 'dias-nao-uteis',
} as const

function resolveSectionPermission(section: string) {
  return sectionPermissionMap[section as keyof typeof sectionPermissionMap] ?? null
}

export default defineEventHandler(async (event) => {
  try {
    const section = getRouterParam(event, 'section')

    if (!section) {
      throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada.' })
    }

    const permissionModule = resolveSectionPermission(section)

    if (!permissionModule) {
      throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada.' })
    }

    if (event.method === 'GET') {
      await requirePermission(event, `${permissionModule}.view`)
      return await listSection(section as never, event)
    }

    if (event.method === 'POST') {
      await requirePermission(event, `${permissionModule}.create`)
      return await createSection(section as never, event)
    }

    throw createError({ statusCode: 405, statusMessage: 'Método não permitido.' })
  } catch (error) {
    handleBackofficeInfrastructureError(error)
  }
})
