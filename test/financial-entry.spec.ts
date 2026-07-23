import { describe, expect, it } from 'vitest'
import type { FinancialEntryFormValues } from '~/types/financial'
import {
  createFinancialEntryForm,
  financialEntrySchema,
} from '~/validators/financial-entry'

function createValidEntry(overrides: Partial<FinancialEntryFormValues> = {}) {
  return {
    ...createFinancialEntryForm(),
    direction: 'EXPENSE',
    type: 'NORMAL',
    description: 'Mensalidade do sistema',
    amount: '100',
    accountId: 'account_1',
    categoryId: 'category_1',
    ...overrides,
  } satisfies FinancialEntryFormValues
}

describe('financial entry validation', () => {
  it('allows one-time entries without recurrence total', async () => {
    const result = await financialEntrySchema.safeParseAsync(createValidEntry())

    expect(result.success).toBe(true)
  })

  it('requires category for non-transfer entries', async () => {
    const result = await financialEntrySchema.safeParseAsync(createValidEntry({
      categoryId: '',
    }))

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(expect.objectContaining({
      path: ['categoryId'],
      message: 'Selecione a categoria.',
    }))
  })

  it('allows transfer entries without category', async () => {
    const result = await financialEntrySchema.safeParseAsync(createValidEntry({
      type: 'TRANSFER',
      categoryId: '',
      transferTargetAccountId: 'account_2',
    }))

    expect(result.success).toBe(true)
  })

  it('requires different origin and target accounts for transfers', async () => {
    const result = await financialEntrySchema.safeParseAsync(createValidEntry({
      type: 'TRANSFER',
      categoryId: '',
      transferTargetAccountId: 'account_1',
    }))

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(expect.objectContaining({
      path: ['transferTargetAccountId'],
      message: 'A conta de destino deve ser diferente da origem.',
    }))
  })

  it('requires a valid installment total for installment entries', async () => {
    const result = await financialEntrySchema.safeParseAsync(createValidEntry({
      recurrenceType: 'INSTALLMENT',
      recurrenceFrequency: 'MONTHLY',
      recurrenceTotal: '1',
    }))

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(expect.objectContaining({
      path: ['recurrenceTotal'],
      message: 'Informe um número entre 2 e 120.',
    }))
  })

  it('requires frequency for recurring entries', async () => {
    const result = await financialEntrySchema.safeParseAsync(createValidEntry({
      recurrenceType: 'FIXED',
      recurrenceFrequency: '',
      recurrenceTotal: '',
    }))

    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: ['recurrenceFrequency'],
        message: 'Selecione a frequência.',
      }),
    ]))
  })

  it('allows fixed recurring entries without total as an indefinite series', async () => {
    const result = await financialEntrySchema.safeParseAsync(createValidEntry({
      recurrenceType: 'FIXED',
      recurrenceFrequency: 'MONTHLY',
      recurrenceTotal: '',
    }))

    expect(result.success).toBe(true)
  })

  it('accepts finite recurring entries with frequency and occurrence count', async () => {
    const result = await financialEntrySchema.safeParseAsync(createValidEntry({
      recurrenceType: 'FIXED',
      recurrenceFrequency: 'MONTHLY',
      recurrenceTotal: '12',
    }))

    expect(result.success).toBe(true)
  })
})
