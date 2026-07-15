import { google } from 'googleapis'
import type { admin_directory_v1 } from 'googleapis'

function getRequiredEnv(name: 'ROOT_USER_EMAIL' | 'GOOGLE_SERVICE_ACCOUNT_JSON') {
  const value = process.env[name]

  if (!value) {
    throw createError({
      statusCode: 500,
      message: `${name} is not configured.`,
    })
  }

  return value
}

// Cache the JWT client to allow google-auth-library to reuse access tokens.
// This prevents a redundant HTTP request to Google's token endpoint on every authenticated API call.
let cachedAuthClient: InstanceType<typeof google.auth.JWT> | null = null

function createGoogleAuth() {
  if (cachedAuthClient) {
    return cachedAuthClient
  }

  const rootUserEmail = getRequiredEnv('ROOT_USER_EMAIL')
  const serviceAccountJson = getRequiredEnv('GOOGLE_SERVICE_ACCOUNT_JSON')

  const credentials = JSON.parse(serviceAccountJson) as {
    client_email: string
    private_key: string
  }

  cachedAuthClient = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
    subject: rootUserEmail,
  })

  return cachedAuthClient
}

export async function getGoogleWorkspaceUser(email: string) {
  const auth = createGoogleAuth()

  const directory = google.admin({
    version: 'directory_v1',
    auth,
  })

  const response = await directory.users.get({
    userKey: email,
    projection: 'full',
  })

  return response.data as admin_directory_v1.Schema$User
}
