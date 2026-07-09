import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContactFormValues } from '~/types/backoffice'
import { contactSchema } from '~/validators/contact'

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    tag: {
      update: vi.fn(),
    },
    category: {
      count: vi.fn(),
      update: vi.fn(),
    },
    account: {
      update: vi.fn(),
    },
    costCenter: {
      update: vi.fn(),
    },
    paymentMethod: {
      update: vi.fn(),
    },
    contact: {
      update: vi.fn(),
    },
    nonBusinessDay: {
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

import { prisma } from '~~/server/utils/prisma'
import { deleteSection, normalizeContactPayload } from '~~/server/utils/backoffice'

function createBaseContact(overrides: Partial<ContactFormValues> = {}): ContactFormValues {
  return {
    name: 'Contato teste',
    tradeName: '',
    document: '',
    documentType: '',
    nature: 'INDIVIDUAL',
    roles: ['CLIENT'],
    birthDate: '',
    municipalRegistration: '',
    email: 'contato@empresa.com',
    phone: '(85) 99999-0000',
    notes: '',
    isActive: true,
    address: {
      country: 'BRASIL',
      state: '',
      city: '',
      postalCode: '',
      street: '',
      number: '',
      complement: '',
      district: '',
    },
    financialResponsible: {
      name: '',
      email: '',
      phone: '',
      role: '',
    },
    ...overrides,
  }
}

describe('Backoffice spec closure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows foreign contacts without a document in the client validation schema', async () => {
    const result = await contactSchema.safeParseAsync(createBaseContact({
      nature: 'FOREIGN',
      roles: ['OTHER'],
      email: '',
      phone: '',
      document: '',
    }))

    expect(result.success).toBe(true)
  })

  it('requires e-mail and phone for individual contacts on the server payload normalization', () => {
    expect(() => normalizeContactPayload(createBaseContact({
      email: '',
      phone: '',
      document: '123.456.789-00',
    }))).toThrowError(/e-mail|telefone/i)
  })

  it('requires a financial responsible for company contacts on the server payload normalization', () => {
    expect(() => normalizeContactPayload(createBaseContact({
      nature: 'COMPANY',
      document: '12.345.678/0001-90',
      financialResponsible: {
        name: '',
        email: '',
        phone: '',
        role: '',
      },
    }))).toThrowError(/responsavel financeiro/i)
  })

  it('soft deletes tags instead of removing them physically', async () => {
    await deleteSection('tags', 'tag_1')

    expect(prisma.tag.update).toHaveBeenCalledWith({
      where: { id: 'tag_1' },
      data: {
        deletedAt: expect.any(Date),
      },
    })
  })

  it('blocks category deletion when subcategories still exist', async () => {
    vi.mocked(prisma.category.count).mockResolvedValue(2)

    await expect(deleteSection('categorias', 'cat_1')).rejects.toMatchObject({
      statusCode: 409,
      data: {
        title: 'Categoria com dependencias',
      },
    })

    expect(prisma.category.update).not.toHaveBeenCalled()
  })

  it('soft deletes categories when there are no remaining subcategories', async () => {
    vi.mocked(prisma.category.count).mockResolvedValue(0)

    await deleteSection('categorias', 'cat_1')

    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'cat_1' },
      data: {
        deletedAt: expect.any(Date),
      },
    })
  })
})
