import type { NonBusinessDay, NonBusinessDayRule } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addUtcDays(date: Date, days: number) {
  const copy = startOfUtcDay(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function matchesFixedRule(record: NonBusinessDay, date: Date) {
  return record.month === date.getUTCMonth() + 1 && record.day === date.getUTCDate()
}

function calculateEasterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(Date.UTC(year, month - 1, day))
}

function getCalculatedHolidayDate(year: number, rule: NonBusinessDayRule) {
  const easterSunday = calculateEasterSunday(year)

  switch (rule) {
    case 'EASTER_MINUS_47':
      return addUtcDays(easterSunday, -47)
    case 'EASTER_MINUS_2':
      return addUtcDays(easterSunday, -2)
    case 'EASTER_PLUS_60':
      return addUtcDays(easterSunday, 60)
  }
}

function isSameUtcDay(left: Date, right: Date) {
  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth()
    && left.getUTCDate() === right.getUTCDate()
}

function matchesCustomRule(record: NonBusinessDay, date: Date) {
  return Boolean(record.date && isSameUtcDay(record.date, date))
}

function matchesCalculatedRule(record: NonBusinessDay, date: Date) {
  if (!record.rule) {
    return false
  }

  return isSameUtcDay(getCalculatedHolidayDate(date.getUTCFullYear(), record.rule), date)
}

function isConfiguredNonBusinessDay(record: NonBusinessDay, date: Date) {
  switch (record.type) {
    case 'FIXED':
      return matchesFixedRule(record, date)
    case 'CUSTOM':
      return matchesCustomRule(record, date)
    case 'CALCULATED':
      return matchesCalculatedRule(record, date)
  }
}

export async function resolveEffectiveDueDate(scheduledDueDate: Date) {
  const configuredDays = await prisma.nonBusinessDay.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
  })

  let cursor = startOfUtcDay(scheduledDueDate)

  while (
    cursor.getUTCDay() === 0
    || configuredDays.some((record) => isConfiguredNonBusinessDay(record, cursor))
  ) {
    cursor = addUtcDays(cursor, 1)
  }

  return cursor
}
