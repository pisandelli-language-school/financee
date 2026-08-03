import { describe, expect, it } from 'vitest'
import {
  automationRules,
  financialInstitutions,
  jobDefinitions,
} from '../prisma/seed-data.mjs'

describe('seed data', () => {
  it('defines the supported financial institutions for local QA', () => {
    expect(financialInstitutions.map(item => item.code)).toEqual([
      'banco-do-brasil',
      'bradesco',
      'caixa',
      'inter',
      'itau',
      'nubank',
      'pagbank',
      'santander',
    ])

    expect(new Set(financialInstitutions.map(item => item.code)).size).toBe(financialInstitutions.length)
    expect(financialInstitutions.every(item => item.logoKey.length > 0)).toBe(true)
  })

  it('keeps the MVP automation catalog complete and coherent', () => {
    expect(automationRules.map(rule => rule.key)).toEqual([
      'contract-ending-soon',
      'overdue-entry',
      'entry-due-soon',
      'negative-cash-flow',
      'contract-without-generated-entries',
      'contract-without-payment-condition',
    ])

    expect(automationRules.every(rule => ['INFO', 'WARNING', 'CRITICAL'].includes(rule.severity))).toBe(true)
    expect(automationRules.every(rule => Array.isArray(rule.config.recipientRoles) && rule.config.recipientRoles.length > 0)).toBe(true)
  })

  it('ships the expected manual/automatic jobs in the QA seed', () => {
    expect(jobDefinitions.map(job => job.key)).toEqual([
      'check-contracts',
      'check-overdue-entries',
      'check-cashflow',
      'check-contracts-without-entries',
      'extend-recurrence-window',
      'expire-notifications',
      'purge-integration-payloads',
    ])

    expect(jobDefinitions.every(job => job.mode === 'BOTH')).toBe(true)
    expect(jobDefinitions.every(job => job.scheduleLabel === 'Diariamente')).toBe(true)
  })
})
