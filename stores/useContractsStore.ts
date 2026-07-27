import { ContractsModule } from '~~/app/api/contracts'
import type { ContractFilters, ContractFormValues } from '~~/app/types/contracts'
import { createCrudStore } from './_createCrudStore'

export const useContractsStore = createCrudStore(
  'contracts',
  {
    list: ContractsModule.list,
    get: ContractsModule.get,
    create: (payload: ContractFormValues) => ContractsModule.create(payload),
    update: (id: string, payload: ContractFormValues) => ContractsModule.update(id, payload),
    delete: async () => {
      throw new Error('Operação não suportada.')
    },
  },
  (): ContractFilters => ({
    search: '',
    status: '',
    clientId: '',
    page: 1,
    pageSize: 50,
  }),
)
