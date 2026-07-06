import { ContactModule } from '~~/app/api/backoffice'
import { createCrudStore } from './_createCrudStore'
import type { ContactFilters } from '~~/app/types/backoffice'

export const useContactsStore = createCrudStore(
  'contacts',
  ContactModule,
  (): ContactFilters => ({
    search: '',
    nature: '',
    role: '',
    page: 1,
    pageSize: 5,
  }),
)
