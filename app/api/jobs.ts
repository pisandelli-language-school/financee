import type { JobDefinitionRecord, JobExecutionRecord } from '~/types/jobs'

interface JobsRequestOptions {
  method: 'GET' | 'PATCH' | 'POST'
  body?: object
  query?: object
  headers?: Record<string, string | undefined>
}

function useJobsRequestOptions() {
  if (!import.meta.server) {
    return {}
  }

  return {
    headers: useRequestHeaders(['cookie']),
  }
}

async function fetchJobs<T>(endpoint: string, options: JobsRequestOptions) {
  const request = $fetch as unknown as (url: string, options: JobsRequestOptions) => Promise<T>
  return await request(endpoint, options)
}

export const JobsModule = {
  async list() {
    const requestOptions = useJobsRequestOptions()
    return await fetchJobs<JobDefinitionRecord[]>('/api/jobs', {
      method: 'GET',
      ...requestOptions,
    })
  },
  async getExecutions(jobKey: string, limit = 20) {
    const requestOptions = useJobsRequestOptions()
    return await fetchJobs<JobExecutionRecord[]>('/api/jobs/executions', {
      method: 'GET',
      query: {
        key: jobKey,
        limit,
      },
      ...requestOptions,
    })
  },
  async toggle(jobKey: string, isEnabled: boolean) {
    const requestOptions = useJobsRequestOptions()
    return await fetchJobs<JobDefinitionRecord>('/api/jobs/toggle', {
      method: 'PATCH',
      body: {
        key: jobKey,
        isEnabled,
      },
      ...requestOptions,
    })
  },
  async run(jobKey: string) {
    const requestOptions = useJobsRequestOptions()
    return await fetchJobs<JobExecutionRecord>('/api/jobs/run', {
      method: 'POST',
      body: {
        key: jobKey,
      },
      ...requestOptions,
    })
  },
}
