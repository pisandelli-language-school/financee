import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    nonBusinessDay: {
      findMany: vi.fn(),
    },
  },
}))

const { prisma } = await import('~~/server/utils/prisma')
const { resolveEffectiveDueDate } = await import('~~/server/utils/financial-calendar')

describe('financial calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.nonBusinessDay.findMany).mockResolvedValue([])
  })

  it('pushes sunday due dates to monday even without configured holidays', async () => {
    const effectiveDueDate = await resolveEffectiveDueDate(new Date('2026-07-19T00:00:00.000Z'))

    expect(effectiveDueDate.toISOString().slice(0, 10)).toBe('2026-07-20')
  })

  it('keeps weekday due dates when there is no non-business day rule', async () => {
    const effectiveDueDate = await resolveEffectiveDueDate(new Date('2026-07-22T00:00:00.000Z'))

    expect(effectiveDueDate.toISOString().slice(0, 10)).toBe('2026-07-22')
  })

  it('skips configured custom non-business days after sunday adjustment', async () => {
    vi.mocked(prisma.nonBusinessDay.findMany).mockResolvedValue([
      {
        id: 'nbd_custom_1',
        title: 'Recesso interno',
        description: null,
        type: 'CUSTOM',
        scope: 'NATIONAL',
        rule: null,
        month: null,
        day: null,
        date: new Date('2026-07-20T00:00:00.000Z'),
        isActive: true,
        deletedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ])

    const effectiveDueDate = await resolveEffectiveDueDate(new Date('2026-07-19T00:00:00.000Z'))

    expect(effectiveDueDate.toISOString().slice(0, 10)).toBe('2026-07-21')
  })
})
