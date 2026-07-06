import { NonBusinessDayModule } from '~~/app/api/backoffice'
import { createCrudStore } from './_createCrudStore'
import type { NonBusinessDayFilters } from '~~/app/types/backoffice'

export const useNonBusinessDaysStore = createCrudStore(
  'nonBusinessDays',
  NonBusinessDayModule,
  (): NonBusinessDayFilters => ({
    search: '',
    type: '',
    page: 1,
    pageSize: 5,
  }),
)
