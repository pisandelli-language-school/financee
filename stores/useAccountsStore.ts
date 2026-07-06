import { AccountModule } from '~~/app/api/backoffice'
import { createCrudStore } from './_createCrudStore'

export const useAccountsStore = createCrudStore(
  'accounts',
  AccountModule,
  () => ({
    search: '',
    page: 1,
    pageSize: 5,
  }),
)
