import 'dotenv/config'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const CLIENT_ID = 'hoppscotch-local'
const CLIENT_NAME = 'Hoppscotch local'
const SCOPES = ['contacts.read', 'contracts.read', 'financial_status.read']
const EXPIRY_DAYS = 90
const JWT_ISSUER = 'financee'
const JWT_AUDIENCE = 'financee-integrations'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Este script é exclusivo para testes locais e não pode rodar em produção.')
}

const connectionString = process.env.DATABASE_URL
const jwtSecret = process.env.INTEGRATION_JWT_SECRET?.trim()

if (!connectionString) {
  throw new Error('DATABASE_URL is missing.')
}

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('INTEGRATION_JWT_SECRET must contain at least 32 characters.')
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(connectionString),
})

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function sign(value) {
  return createHmac('sha256', jwtSecret).update(value).digest('base64url')
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

try {
  const now = new Date()
  const issuedAt = Math.floor(now.getTime() / 1000)
  const expiresAt = new Date((issuedAt + EXPIRY_DAYS * 24 * 60 * 60) * 1000)
  const client = await prisma.integrationClient.upsert({
    where: { clientId: CLIENT_ID },
    update: {
      name: CLIENT_NAME,
      isActive: true,
      scopes: {
        deleteMany: {},
        create: SCOPES.map(scopeKey => ({ scopeKey })),
      },
    },
    create: {
      name: CLIENT_NAME,
      clientId: CLIENT_ID,
      scopes: {
        create: SCOPES.map(scopeKey => ({ scopeKey })),
      },
    },
  })

  await prisma.integrationClientCredential.updateMany({
    where: {
      clientId: client.id,
      revokedAt: null,
    },
    data: { revokedAt: now },
  })

  const payload = {
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    sub: client.id,
    jti: randomUUID(),
    iat: issuedAt,
    exp: Math.floor(expiresAt.getTime() / 1000),
  }
  const encodedHeader = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signedValue = `${encodedHeader}.${encodedPayload}`
  const token = `${signedValue}.${sign(signedValue)}`

  await prisma.integrationClientCredential.create({
    data: {
      clientId: client.id,
      tokenHash: hashToken(token),
      expiresAt,
    },
  })

  console.log('Cliente de teste preparado:', CLIENT_ID)
  console.log('Expira em:', expiresAt.toISOString())
  console.log('Copie o token abaixo agora; ele não é armazenado em claro:')
  console.log(token)
} finally {
  await prisma.$disconnect()
}
