import { systemRoleNames } from '~~/app/types/auth'
import {
  buildPermissionCatalog,
  getSystemRolePermissions,
} from '~~/server/utils/rbac-catalog'
import { prisma } from '~~/server/utils/prisma'

const globalForRbac = globalThis as typeof globalThis & {
  __financeeRbacSeeded?: boolean
  __financeeRbacSeedPromise?: Promise<void>
}

export async function ensureRbacSeeded() {
  if (globalForRbac.__financeeRbacSeeded) {
    return
  }

  if (!globalForRbac.__financeeRbacSeedPromise) {
    globalForRbac.__financeeRbacSeedPromise = seedRbac()
      .then(() => {
        globalForRbac.__financeeRbacSeeded = true
      })
      .finally(() => {
        globalForRbac.__financeeRbacSeedPromise = undefined
      })
  }

  await globalForRbac.__financeeRbacSeedPromise
}

async function seedRbac() {
  const permissionKeys = buildPermissionCatalog()

  await Promise.all(permissionKeys.map(async (key) => {
    const [module = '', action = ''] = key.split('.')

    await prisma.permission.upsert({
      where: { key },
      update: {
        module,
        action,
      },
      create: {
        key,
        module,
        action,
      },
    })
  }))

  await Promise.all(systemRoleNames.map(async (roleName) => {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {
        isSystem: true,
      },
      create: {
        name: roleName,
        isSystem: true,
      },
    })
  }))

  for (const roleName of systemRoleNames) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: roleName },
      select: { id: true },
    })

    const grantedPermissionKeys = getSystemRolePermissions(roleName)

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    })

    for (const key of grantedPermissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key },
        select: { id: true },
      })

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      })
    }
  }
}
