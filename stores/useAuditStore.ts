import { AuditModule } from '~~/app/api/auth'
import type { AuditFilters } from '~~/app/types/auth'
import { createCrudStore } from './_createCrudStore'

export const useAuditStore = createCrudStore(
  'audit-log',
  {
    list: AuditModule.list,
    create: async () => {
      throw new Error('Operação não suportada.')
    },
    update: async () => {
      throw new Error('Operação não suportada.')
    },
    delete: async () => {
      throw new Error('Operação não suportada.')
    },
  },
  (): AuditFilters => ({
    search: '',
    severity: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    pageSize: 50,
  }),
)
