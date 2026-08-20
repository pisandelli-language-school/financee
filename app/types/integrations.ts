export const integrationScopeOptions = [
  { label: 'Ler contatos', value: 'contacts.read' },
  { label: 'Ler contratos', value: 'contracts.read' },
  { label: 'Ler status financeiro', value: 'financial_status.read' },
] as const

export interface IntegrationClientRecord {
  id: string
  name: string
  clientId: string
  isActive: boolean
  scopes: string[]
  activeCredential: { id: string, expiresAt: string, lastUsedAt: string | null } | null
  createdAt: string
  updatedAt: string
}

export interface IntegrationClientFormValues {
  name: string
  clientId: string
  scopes: string[]
  isActive: boolean
}

export interface IntegrationLogRecord {
  id: string
  provider: string
  operation: string
  direction: 'OUTBOUND' | 'INBOUND' | 'EXPOSED_API'
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IGNORED'
  errorMessage: string | null
  entityType: string | null
  entityId: string | null
  clientName: string | null
  clientKey: string | null
  createdAt: string
}

export interface IntegrationLogDetailRecord extends IntegrationLogRecord {
  requestSummary: unknown
  responseSummary: unknown
  rawPayload: unknown
}
