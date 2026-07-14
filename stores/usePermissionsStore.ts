import { AuthRolesModule } from '~~/app/api/auth'
import type { AuthRolesFilters } from '~~/app/types/auth'
import { createCrudStore } from './_createCrudStore'

export const usePermissionsStore = createCrudStore(
  'auth-roles',
  {
    list: AuthRolesModule.list,
    create: async () => {
      throw new Error('Operação não suportada.')
    },
    update: (id, payload: { permissionKeys: string[] }) => AuthRolesModule.updatePermissions(id, payload.permissionKeys),
    delete: async () => {
      throw new Error('Operação não suportada.')
    },
  },
  (): AuthRolesFilters => ({
    search: '',
    page: 1,
    pageSize: 50,
  }),
)
