import { CategoryModule } from '~~/app/api/backoffice'
import { createCrudStore } from './_createCrudStore'
import type { CategoryFilters } from '~~/app/types/backoffice'

export const useCategoriesStore = createCrudStore(
  'categories',
  CategoryModule,
  (): CategoryFilters => ({
    search: '',
    type: '',
    page: 1,
    pageSize: 50,
  }),
)
