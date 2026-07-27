import { describe, expect, it } from 'vitest'
import {
  buildCashFlowBuckets,
  buildDreGroups,
  calculateOverdueDays,
  deriveDelinquencyTemperature,
} from '~~/server/utils/reporting-helpers'

describe('reporting rules', () => {
  it('builds cash flow buckets separating realized and projected totals', () => {
    const buckets = buildCashFlowBuckets([
      {
        kind: 'realized',
        direction: 'INCOME',
        amount: 1000,
        date: new Date('2026-07-05T00:00:00.000Z'),
      },
      {
        kind: 'realized',
        direction: 'EXPENSE',
        amount: 250,
        date: new Date('2026-07-10T00:00:00.000Z'),
      },
      {
        kind: 'projected',
        direction: 'EXPENSE',
        amount: 400,
        date: new Date('2026-07-20T00:00:00.000Z'),
      },
      {
        kind: 'projected',
        direction: 'INCOME',
        amount: 500,
        date: new Date('2026-08-03T00:00:00.000Z'),
      },
    ], '2026-07-01', '2026-08-31')

    expect(buckets).toHaveLength(2)
    expect(buckets[0]).toMatchObject({
      periodKey: '2026-07',
      realizedIncome: 1000,
      realizedExpense: 250,
      realizedNet: 750,
      projectedIncome: 0,
      projectedExpense: 400,
      projectedNet: -400,
    })
    expect(buckets[1]).toMatchObject({
      periodKey: '2026-08',
      realizedIncome: 0,
      realizedExpense: 0,
      projectedIncome: 500,
      projectedExpense: 0,
      projectedNet: 500,
    })
  })

  it('calculates overdue days from effective due date instead of scheduled due date', () => {
    expect(calculateOverdueDays('2026-07-10', '2026-07-27')).toBe(17)
  })

  it('derives low, medium and high delinquency temperatures', () => {
    expect(deriveDelinquencyTemperature(3)).toBe('LOW')
    expect(deriveDelinquencyTemperature(12)).toBe('MEDIUM')
    expect(deriveDelinquencyTemperature(45)).toBe('HIGH')
  })

  it('groups DRE by configured group and keeps uncategorized entries visible', () => {
    const groups = buildDreGroups([
      {
        categoryId: 'cat-1',
        categoryName: 'Mensalidades',
        dreGroup: 'OPERATING_REVENUE',
        signedAmount: 1200,
      },
      {
        categoryId: 'cat-1',
        categoryName: 'Mensalidades',
        dreGroup: 'OPERATING_REVENUE',
        signedAmount: 300,
      },
      {
        categoryId: 'cat-2',
        categoryName: 'Equipe',
        dreGroup: 'OPERATING_EXPENSE',
        signedAmount: -500,
      },
      {
        categoryId: null,
        categoryName: null,
        dreGroup: null,
        signedAmount: -90,
      },
    ])

    expect(groups).toHaveLength(3)
    expect(groups.find(group => group.key === 'OPERATING_REVENUE')).toMatchObject({
      label: 'Receita operacional',
      amount: 1500,
      categories: [
        {
          categoryId: 'cat-1',
          categoryName: 'Mensalidades',
          amount: 1500,
        },
      ],
    })
    expect(groups.find(group => group.key === 'OPERATING_EXPENSE')).toMatchObject({
      label: 'Despesa operacional',
      amount: -500,
    })
    expect(groups.find(group => group.key === 'UNCLASSIFIED')).toMatchObject({
      label: 'Não classificado',
      amount: -90,
      categories: [
        {
          categoryId: null,
          categoryName: 'Sem categoria',
          amount: -90,
        },
      ],
    })
  })
})
