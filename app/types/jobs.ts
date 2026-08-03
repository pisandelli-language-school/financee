export type JobMode = 'AUTOMATIC' | 'MANUAL' | 'BOTH'
export type JobExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL'

export interface JobExecutionRecord {
  id: string
  jobKey: string
  status: JobExecutionStatus
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  errorMessage: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface JobDefinitionRecord {
  id: string
  key: string
  title: string
  mode: JobMode
  isEnabled: boolean
  disabledAt: string | null
  disabledById: string | null
  disabledByName: string | null
  scheduleLabel: string | null
  createdAt: string
  updatedAt: string
  lastExecution: JobExecutionRecord | null
}

export interface JobsFilters {
  search: string
  mode: JobMode | ''
  status: JobExecutionStatus | ''
}
