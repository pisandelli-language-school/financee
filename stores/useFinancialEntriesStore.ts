import { FinancialEntriesModule } from '~~/app/api/financial'
import type { FinancialEntryCreatePayload, FinancialEntryFilters } from '~~/app/types/financial'
import { createCrudStore } from './_createCrudStore'

export const useFinancialEntriesStore = createCrudStore(
  'financial-entries',
  {
    list: FinancialEntriesModule.list,
    get: FinancialEntriesModule.get,
    create: (payload: FinancialEntryCreatePayload) => FinancialEntriesModule.create(payload),
    update: async () => {
      throw new Error('Operação não suportada.')
    },
    delete: async () => {
      throw new Error('Operação não suportada.')
    },
  },
  (): FinancialEntryFilters => ({
    search: '',
    direction: '',
    status: '',
    accountId: '',
    categoryId: '',
    contactId: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    pageSize: 50,
  }),
)
