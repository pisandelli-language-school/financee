import { requirePermission } from '~~/server/utils/auth'
import { listJobs } from '~~/server/utils/jobs'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'jobs.view')
  return await listJobs()
})
