import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useJobsStore } from '../stores/useJobsStore'

const { JobsModule } = vi.hoisted(() => ({
  JobsModule: {
    list: vi.fn(),
    getExecutions: vi.fn(),
    toggle: vi.fn(),
    run: vi.fn(),
  },
}))

vi.mock('~/api/jobs', () => ({
  JobsModule,
}))

describe('useJobsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches jobs and exposes filteredData based on search/mode/status', async () => {
    JobsModule.list.mockResolvedValue([
      {
        key: 'check-cashflow',
        title: 'Monitorar fluxo de caixa',
        mode: 'BOTH',
        lastExecution: {
          status: 'SUCCESS',
        },
      },
      {
        key: 'expire-notifications',
        title: 'Arquivar notificações lidas antigas',
        mode: 'AUTOMATIC',
        lastExecution: {
          status: 'FAILED',
        },
      },
    ])

    const store = useJobsStore()

    await store.fetch()

    store.setFilters({
      search: 'arquivar',
      mode: 'AUTOMATIC',
      status: 'FAILED',
    })

    expect(store.data).toHaveLength(2)
    expect(store.filteredData).toEqual([
      {
        key: 'expire-notifications',
        title: 'Arquivar notificações lidas antigas',
        mode: 'AUTOMATIC',
        lastExecution: {
          status: 'FAILED',
        },
      },
    ])
  })

  it('toggles a job and patches only the matching record while preserving the previous last execution', async () => {
    const store = useJobsStore()

    store.data = [
      {
        key: 'check-cashflow',
        title: 'Monitorar fluxo de caixa',
        isEnabled: true,
        lastExecution: {
          id: 'execution-1',
          status: 'SUCCESS',
        },
      },
    ] as never

    JobsModule.toggle.mockResolvedValue({
      key: 'check-cashflow',
      title: 'Monitorar fluxo de caixa',
      isEnabled: false,
      lastExecution: null,
    })

    await store.toggleJob('check-cashflow', false)

    expect(JobsModule.toggle).toHaveBeenCalledWith('check-cashflow', false)
    expect(store.data[0]).toMatchObject({
      key: 'check-cashflow',
      isEnabled: false,
      lastExecution: {
        id: 'execution-1',
        status: 'SUCCESS',
      },
    })
  })

  it('runs a job, refreshes the listing and reloads history when the modal is already open for the same key', async () => {
    const store = useJobsStore()

    store.historyJobKey = 'check-contracts'

    JobsModule.run.mockResolvedValue({
      id: 'execution-9',
      status: 'SUCCESS',
    })
    JobsModule.list.mockResolvedValue([
      {
        key: 'check-contracts',
        title: 'Verificar contratos',
        mode: 'BOTH',
        lastExecution: {
          id: 'execution-9',
          status: 'SUCCESS',
        },
      },
    ])
    JobsModule.getExecutions.mockResolvedValue([
      {
        id: 'execution-9',
        status: 'SUCCESS',
      },
    ])

    const response = await store.runJob('check-contracts')

    expect(JobsModule.run).toHaveBeenCalledWith('check-contracts')
    expect(JobsModule.list).toHaveBeenCalledOnce()
    expect(JobsModule.getExecutions).toHaveBeenCalledWith('check-contracts')
    expect(store.historyItems).toEqual([
      {
        id: 'execution-9',
        status: 'SUCCESS',
      },
    ])
    expect(response).toEqual({
      id: 'execution-9',
      status: 'SUCCESS',
    })
  })

  it('stores a readable history error when loading executions fails', async () => {
    const store = useJobsStore()

    JobsModule.getExecutions.mockRejectedValue(new Error('Falha ao consultar histórico.'))

    await expect(store.loadHistory('expire-notifications')).rejects.toThrow('Falha ao consultar histórico.')

    expect(store.historyError).toBe('Falha ao consultar histórico.')
    expect(store.historyJobKey).toBe('expire-notifications')
  })

  it('resets the history panel state cleanly', async () => {
    const store = useJobsStore()

    store.historyJobKey = 'check-cashflow'
    store.historyItems = [
      {
        id: 'execution-2',
      },
    ] as never
    store.historyError = 'Erro anterior'

    store.resetHistory()

    expect(store.historyJobKey).toBe('')
    expect(store.historyItems).toEqual([])
    expect(store.historyError).toBe('')
  })
})
