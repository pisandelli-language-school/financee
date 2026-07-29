export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface NotificationRecord {
  id: string
  title: string
  message: string
  type: string | null
  severity: NotificationSeverity
  isRead: boolean
  readAt: string | null
  isPriority: boolean
  entityType: string | null
  entityId: string | null
  actionUrl: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface NotificationFilters {
  severity: '' | NotificationSeverity
  status: '' | 'unread' | 'read'
  page: number
  pageSize: number
}

export interface AutomationRuleRecord {
  id: string
  key: string
  title: string
  isEnabled: boolean
  severity: NotificationSeverity
  config: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface AutomationRuleUpdatePayload {
  severity: NotificationSeverity
  config: Record<string, unknown> | null
}

export interface AutomationRuleFormValues {
  isEnabled: boolean
  severity: NotificationSeverity
  recipientRoles: string[]
  daysBeforeEnd: number | null
  daysAfterDue: number | null
  threshold: number | null
  graceDays: number | null
}
