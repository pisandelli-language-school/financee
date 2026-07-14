import { AuthUsersModule } from '~~/app/api/auth'
import type { AuthUsersFilters } from '~~/app/types/auth'
import { createCrudStore } from './_createCrudStore'

export const useAuthUsersStore = createCrudStore(
  'auth-users',
  {
    list: AuthUsersModule.list,
    create: async () => {
      throw new Error('Operação não suportada.')
    },
    update: AuthUsersModule.update,
    delete: async () => {
      throw new Error('Operação não suportada.')
    },
  },
  (): AuthUsersFilters => ({
    search: '',
    page: 1,
    pageSize: 50,
  }),
)
