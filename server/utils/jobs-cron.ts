import type { H3Event } from 'h3'

function readBearerToken(event: H3Event) {
  const authorization = getHeader(event, 'authorization')?.trim()

  if (!authorization?.startsWith('Bearer ')) {
    return ''
  }

  return authorization.slice('Bearer '.length).trim()
}

export function requireJobCronAccess(event: H3Event) {
  const configuredSecret = process.env.JOBS_CRON_SECRET?.trim()

  if (!configuredSecret) {
    throw createError({
      statusCode: 500,
      message: 'JOBS_CRON_SECRET não configurado.',
    })
  }

  const providedSecret =
    readBearerToken(event)
    || getHeader(event, 'x-jobs-cron-secret')?.trim()
    || ''

  if (!providedSecret || providedSecret !== configuredSecret) {
    throw createError({
      statusCode: 401,
      message: 'Acesso de cron não autorizado.',
    })
  }
}
