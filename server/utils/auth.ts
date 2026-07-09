import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'

export async function requireSupabaseUser(event: H3Event) {
  const user = await serverSupabaseUser(event)

  if (!user || !('email' in user) || !user.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Não autorizado.',
    })
  }

  return user
}
