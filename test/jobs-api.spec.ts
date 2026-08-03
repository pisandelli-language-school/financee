import { beforeEach, describe, expect, it, vi } from 'vitest'

const requirePermission = vi.fn()
const createAuditLog = vi.fn()
const getJobExecutions = vi.fn()
const getLastExecution = vi.fn()
const listJobs = vi.fn()
const runJobNow = vi.fn()
const toggleJob = vi.fn()

vi.mock('~~/server/utils/auth', () => ({
  requirePermission,
}))

vi.mock('~~/server/utils/audit', () => ({
  createAuditLog,
}))

vi.mock('~~/server/utils/jobs', () => ({
  getJobExecutions,
  getLastExecution,
  listJobs,
  runJobNow,
  toggleJob,
}))

vi.stubGlobal('createError', (input: { message?: string, statusCode?: number, data?: unknown }) => {
  const error = new Error(input.message ?? 'Erro')

  Object.assign(error, {
    statusCode: input.statusCode,
    data: input.data,
  })

  return error
})

vi.stubGlobal('defineEventHandler', <T>(handler: T) => handler)
vi.stubGlobal('getQuery', vi.fn())
vi.stubGlobal('getRouterParam', vi.fn())
vi.stubGlobal('readBody', vi.fn())

describe('jobs api handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requirePermission.mockResolvedValue({
      user: {
        id: 'actor-1',
        name: 'Pedro',
      },
    })
  })

  it('runs a job manually and writes an audit record', async () => {
    vi.mocked(getRouterParam).mockReturnValue('check-cashflow')
    listJobs.mockResolvedValue([
      {
        id: 'job-1',
        key: 'check-cashflow',
        title: 'Monitorar fluxo de caixa',
      },
    ])
    runJobNow.mockResolvedValue({
      id: 'execution-1',
      status: 'SUCCESS',
    })

    const handler = (await import('~~/server/api/jobs/[key]/run.post')).default
    const response = await handler({})

    expect(runJobNow).toHaveBeenCalledWith('check-cashflow')
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'JOB_EXECUTED_MANUALLY',
      entityId: 'job-1',
      action: 'run.manual',
      actor: {
        id: 'actor-1',
        name: 'Pedro',
      },
    }))
    expect(response).toEqual({
      id: 'execution-1',
      status: 'SUCCESS',
    })
  })

  it('rejects manual run when the job key is missing', async () => {
    vi.mocked(getRouterParam).mockReturnValue('')

    const handler = (await import('~~/server/api/jobs/[key]/run.post')).default

    await expect(handler({})).rejects.toMatchObject({
      message: 'Job inválido.',
      statusCode: 400,
    })
  })

  it('lists executions using the default limit when no explicit limit is provided', async () => {
    vi.mocked(getRouterParam).mockReturnValue('check-contracts')
    vi.mocked(getQuery).mockReturnValue({})
    getJobExecutions.mockResolvedValue([
      {
        id: 'execution-1',
      },
    ])

    const handler = (await import('~~/server/api/jobs/[key]/executions.get')).default
    const response = await handler({})

    expect(getJobExecutions).toHaveBeenCalledWith('check-contracts', 50)
    expect(response).toEqual([
      {
        id: 'execution-1',
      },
    ])
  })

  it('returns the last execution for a job key', async () => {
    vi.mocked(getRouterParam).mockReturnValue('expire-notifications')
    getLastExecution.mockResolvedValue({
      id: 'execution-9',
      status: 'FAILED',
    })

    const handler = (await import('~~/server/api/jobs/[key]/last.get')).default
    const response = await handler({})

    expect(getLastExecution).toHaveBeenCalledWith('expire-notifications')
    expect(response).toEqual({
      id: 'execution-9',
      status: 'FAILED',
    })
  })

  it('rejects toggle requests with an invalid body payload', async () => {
    vi.mocked(getRouterParam).mockReturnValue('extend-recurrence-window')
    vi.mocked(readBody).mockResolvedValue({})

    const handler = (await import('~~/server/api/jobs/[key]/toggle.patch')).default

    await expect(handler({})).rejects.toMatchObject({
      message: 'Estado do job inválido.',
      statusCode: 400,
    })
  })

  it('toggles a job and writes an audit record with before/after states', async () => {
    vi.mocked(getRouterParam).mockReturnValue('expire-notifications')
    vi.mocked(readBody).mockResolvedValue({
      isEnabled: false,
    })
    listJobs.mockResolvedValue([
      {
        id: 'job-9',
        key: 'expire-notifications',
        title: 'Arquivar notificações lidas antigas',
        mode: 'BOTH',
        isEnabled: true,
        disabledAt: null,
        disabledById: null,
      },
    ])
    toggleJob.mockResolvedValue({
      id: 'job-9',
      key: 'expire-notifications',
      title: 'Arquivar notificações lidas antigas',
      mode: 'BOTH',
      isEnabled: false,
      disabledAt: '2026-08-03T12:00:00.000Z',
      disabledById: 'actor-1',
    })

    const handler = (await import('~~/server/api/jobs/[key]/toggle.patch')).default
    const response = await handler({})

    expect(toggleJob).toHaveBeenCalledWith('expire-notifications', false, 'actor-1')
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'JOB_TOGGLED',
      action: 'disable',
      before: {
        isEnabled: true,
        disabledAt: null,
        disabledById: null,
      },
      after: {
        isEnabled: false,
        disabledAt: '2026-08-03T12:00:00.000Z',
        disabledById: 'actor-1',
      },
    }))
    expect(response).toEqual({
      id: 'job-9',
      key: 'expire-notifications',
      title: 'Arquivar notificações lidas antigas',
      mode: 'BOTH',
      isEnabled: false,
      disabledAt: '2026-08-03T12:00:00.000Z',
      disabledById: 'actor-1',
    })
  })
})
