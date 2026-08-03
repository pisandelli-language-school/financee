import { requireJobCronAccess } from '~~/server/utils/jobs-cron'
import { runAutomaticJob } from '~~/server/utils/jobs'

export default defineEventHandler(async (event) => {
  requireJobCronAccess(event)
  return await runAutomaticJob('purge-integration-payloads')
})
