import { CostCenterModule } from '~~/app/api/backoffice'
import { createCrudStore } from './_createCrudStore'

export const useCostCentersStore = createCrudStore(
  'costCenters',
  CostCenterModule,
  () => ({
    search: '',
    page: 1,
    pageSize: 5,
  }),
)
