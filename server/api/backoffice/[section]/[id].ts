import {
  deleteSection,
  getSectionItem,
  handleBackofficeInfrastructureError,
  updateSection,
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
    const id = getRouterParam(event, 'id')

    if (!section || !id) {
      throw createError({ statusCode: 404, statusMessage: 'Recurso não encontrado.' })
    }

    const permissionModule = resolveSectionPermission(section)

    if (!permissionModule) {
      throw createError({ statusCode: 404, statusMessage: 'Recurso não encontrado.' })
    }

    if (event.method === 'GET') {
      await requirePermission(event, `${permissionModule}.view`)
      return await getSectionItem(section as never, id)
    }

    if (event.method === 'PUT') {
      await requirePermission(event, `${permissionModule}.update`)
      return await updateSection(section as never, id, event)
    }

    if (event.method === 'DELETE') {
      await requirePermission(event, `${permissionModule}.delete`)
      return await deleteSection(section as never, id)
    }

    throw createError({ statusCode: 405, statusMessage: 'Método não permitido.' })
  } catch (error) {
    handleBackofficeInfrastructureError(error)
  }
})
