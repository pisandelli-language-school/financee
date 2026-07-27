import type {
  CashFlowBucket,
  DelinquencyTemperature,
  DreCategoryRow,
  DreGroupKey,
  DreGroupRow,
} from '~~/app/types/reporting'

const cashFlowDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function getMonthStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

function addMonths(value: Date, offset: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + offset, 1))
}

function getPeriodKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`
}

function getPeriodLabel(value: Date) {
  const label = cashFlowDateFormatter.format(value)
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
}

function listMonthBuckets(dateFrom: Date, dateTo: Date) {
  const items: Array<{ periodKey: string; label: string }> = []
  let cursor = getMonthStart(dateFrom)
  const limit = getMonthStart(dateTo)

  while (cursor <= limit) {
    items.push({
      periodKey: getPeriodKey(cursor),
      label: getPeriodLabel(cursor),
    })
    cursor = addMonths(cursor, 1)
  }

  return items
}

export function buildCashFlowBuckets(
  entries: Array<{
    kind: 'realized' | 'projected'
    direction: 'INCOME' | 'EXPENSE'
    amount: number
    date: Date
  }>,
  dateFrom: string,
  dateTo: string,
): CashFlowBucket[] {
  const buckets = new Map<string, CashFlowBucket>()

  for (const bucket of listMonthBuckets(
    new Date(`${dateFrom}T00:00:00.000Z`),
    new Date(`${dateTo}T00:00:00.000Z`),
  )) {
    buckets.set(bucket.periodKey, {
      periodKey: bucket.periodKey,
      label: bucket.label,
      realizedIncome: 0,
      realizedExpense: 0,
      realizedNet: 0,
      projectedIncome: 0,
      projectedExpense: 0,
      projectedNet: 0,
    })
  }

  for (const entry of entries) {
    const periodKey = getPeriodKey(getMonthStart(entry.date))
    const bucket = buckets.get(periodKey)

    if (!bucket) {
      continue
    }

    if (entry.kind === 'realized') {
      if (entry.direction === 'INCOME') {
        bucket.realizedIncome += entry.amount
      } else {
        bucket.realizedExpense += entry.amount
      }
    } else if (entry.direction === 'INCOME') {
      bucket.projectedIncome += entry.amount
    } else {
      bucket.projectedExpense += entry.amount
    }

    bucket.realizedNet = bucket.realizedIncome - bucket.realizedExpense
    bucket.projectedNet = bucket.projectedIncome - bucket.projectedExpense
  }

  return Array.from(buckets.values())
}

export function calculateOverdueDays(effectiveDueDate: string, referenceDate: string) {
  const start = new Date(`${effectiveDueDate}T00:00:00.000Z`)
  const end = new Date(`${referenceDate}T00:00:00.000Z`)
  const diff = end.valueOf() - start.valueOf()

  return Math.max(0, Math.floor(diff / 86_400_000))
}

export function deriveDelinquencyTemperature(overdueDays: number): DelinquencyTemperature {
  if (overdueDays >= 31) {
    return 'HIGH'
  }

  if (overdueDays >= 8) {
    return 'MEDIUM'
  }

  return 'LOW'
}

const dreGroupLabels: Record<DreGroupKey, string> = {
  OPERATING_REVENUE: 'Receita operacional',
  OPERATING_EXPENSE: 'Despesa operacional',
  FINANCIAL_RESULT: 'Resultado financeiro',
  NON_OPERATING: 'Não operacional',
  UNCLASSIFIED: 'Não classificado',
}

export function getDreGroupLabel(group: DreGroupKey) {
  return dreGroupLabels[group]
}

export function buildDreGroups(
  entries: Array<{
    categoryId: string | null
    categoryName: string | null
    dreGroup: Exclude<DreGroupKey, 'UNCLASSIFIED'> | null
    signedAmount: number
  }>,
): DreGroupRow[] {
  const groups = new Map<DreGroupKey, {
    key: DreGroupKey
    label: string
    amount: number
    categories: Map<string, DreCategoryRow>
  }>()

  for (const entry of entries) {
    const key = entry.dreGroup ?? 'UNCLASSIFIED'
    const categoryId = entry.categoryId ?? `uncategorized:${entry.categoryName ?? 'unknown'}`
    const categoryName = entry.categoryName ?? 'Sem categoria'
    const currentGroup = groups.get(key) ?? {
      key,
      label: getDreGroupLabel(key),
      amount: 0,
      categories: new Map<string, DreCategoryRow>(),
    }

    currentGroup.amount += entry.signedAmount

    const currentCategory = currentGroup.categories.get(categoryId) ?? {
      categoryId: entry.categoryId,
      categoryName,
      amount: 0,
    }

    currentCategory.amount += entry.signedAmount
    currentGroup.categories.set(categoryId, currentCategory)
    groups.set(key, currentGroup)
  }

  return Array.from(groups.values())
    .map(group => ({
      key: group.key,
      label: group.label,
      amount: group.amount,
      categories: Array.from(group.categories.values())
        .sort((left, right) => left.categoryName.localeCompare(right.categoryName, 'pt-BR')),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'))
}
