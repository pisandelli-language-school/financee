<script setup lang="ts">
import type { AppTableColumn } from '~/types/backoffice'
import { useReportsStore } from '~~/stores/useReportsStore'
import { useUserPreferencesStore } from '~~/stores/useUserPreferencesStore'
import {
  endOfMonth,
  formatMonthLabel,
  parseMonthKey,
  shiftMonth,
  startOfMonth,
  toDateInput,
  toMonthKey,
} from '~/utils/report-period'

const reportsStore = useReportsStore()
const preferencesStore = useUserPreferencesStore()
const { showToast } = useToaster()
const finCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})
const finDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const breadcrumb = {
  routes: [
    { label: 'Relatórios', to: '/relatorios' },
    { label: 'Inadimplência' },
  ],
}

const columns: AppTableColumn[] = [
  { key: 'description', title: 'Lançamento', width: '260px' },
  { key: 'contactName', title: 'Contato', width: '180px' },
  { key: 'accountName', title: 'Conta', width: '160px' },
  { key: 'effectiveDueDate', title: 'Vencimento efetivo', width: '160px' },
  { key: 'overdueDays', title: 'Atraso', width: '100px', align: 'center' },
  { key: 'temperature', title: 'Temperatura', width: '140px', align: 'center' },
  { key: 'amount', title: 'Valor', width: '140px' },
]

const isPersisting = ref(false)
const requestError = ref('')

reportsStore.setView('inadimplencia')

if (!reportsStore.filters.period) {
  reportsStore.setFilters({
    period: toMonthKey(startOfMonth(new Date())),
  })
}

function getVisibleMonth() {
  return parseMonthKey(reportsStore.filters.period) ?? startOfMonth(new Date())
}

const periodLabel = computed(() => formatMonthLabel(getVisibleMonth()))
const referenceDate = computed(() => {
  const today = new Date()
  const monthEnd = endOfMonth(getVisibleMonth())
  return today < monthEnd ? today : monthEnd
})
const referenceDateLabel = computed(() => formatDate(toDateInput(referenceDate.value)))
const items = computed(() => reportsStore.delinquency?.items ?? [])
const isEmpty = computed(() => !reportsStore.loading && !items.value.length)

await loadDelinquency()

watch(() => reportsStore.filters.period, async (current, previous) => {
  if (current === previous) {
    return
  }

  await loadDelinquency()
  void persistPreferences()
})

const summaryCards = computed(() => {
  const totals = reportsStore.delinquency?.totals ?? {
    count: 0,
    amount: 0,
    low: 0,
    medium: 0,
    high: 0,
  }

  return [
    {
      key: 'count',
      label: 'Títulos em atraso',
      value: String(totals.count),
      description: 'Quantidade de lançamentos vencidos e ainda em aberto.',
      tone: totals.count > 0 ? 'warning' : 'info',
    },
    {
      key: 'amount',
      label: 'Exposição total',
      value: formatCurrency(totals.amount),
      description: 'Soma financeira em aberto pela referência atual.',
      tone: totals.amount > 0 ? 'danger' : 'info',
    },
    {
      key: 'high',
      label: 'Temperatura alta',
      value: String(totals.high),
      description: 'Casos com atraso acima de 30 dias.',
      tone: totals.high > 0 ? 'danger' : 'success',
    },
  ] as const
})

async function loadDelinquency() {
  requestError.value = ''

  try {
    await reportsStore.fetchDelinquency({
      dateFrom: toDateInput(startOfMonth(getVisibleMonth())),
      dateTo: toDateInput(endOfMonth(getVisibleMonth())),
      referenceDate: toDateInput(referenceDate.value),
    })
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : 'Não foi possível carregar a inadimplência.'
  }
}

async function persistPreferences() {
  if (!import.meta.client || !preferencesStore.hydrated || isPersisting.value) {
    return
  }

  isPersisting.value = true

  try {
    await preferencesStore.updatePreferences({
      lastReportView: 'inadimplencia',
      lastReportPeriod: reportsStore.filters.period,
    })
  } catch {
    showToast('Não foi possível salvar suas preferências de relatório.', {
      title: 'Relatórios',
      type: 'error',
    })
  } finally {
    isPersisting.value = false
  }
}

function goToPreviousMonth() {
  reportsStore.setFilters({
    period: toMonthKey(shiftMonth(getVisibleMonth(), -1)),
  })
}

function goToNextMonth() {
  reportsStore.setFilters({
    period: toMonthKey(shiftMonth(getVisibleMonth(), 1)),
  })
}

function formatCurrency(value: number) {
  return finCurrency.format(value)
}

function formatDate(value: string) {
  return finDate.format(new Date(`${value}T00:00:00.000Z`))
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="breadcrumb"
    title="Inadimplência"
    description="Priorize cobranças pela data efetiva de vencimento, valor exposto e gravidade do atraso."
  )

  dd-card
    dd-stack
      dd-cluster(between :class="fin.toolbar")
        dd-cluster(compact :class="fin.periodNav")
          dd-button(
            outline
            icon="lucide:chevron-left"
            icon-only
            aria-label="Mês anterior"
            @click="goToPreviousMonth"
          )
          dd-button(outline :class="fin.periodButton") {{ periodLabel }}
          dd-button(
            outline
            icon="lucide:chevron-right"
            icon-only
            aria-label="Próximo mês"
            @click="goToNextMonth"
          )

        span(:class="fin.referenceInfo") Referência: {{ referenceDateLabel }}

      dd-grid(:class="fin.summaryGrid")
        button(
          v-for="card in summaryCards"
          :key="card.key"
          type="button"
          :class="[fin.summaryCard, { [fin.summarySuccess]: card.tone === 'success', [fin.summaryDanger]: card.tone === 'danger', [fin.summaryWarning]: card.tone === 'warning', [fin.summaryInfo]: card.tone === 'info' }]"
        )
          dd-stack(compact nogap)
            span(:class="fin.summaryLabel") {{ card.label }}
            strong(
              :class="[fin.amount, { [fin.amountPositive]: card.tone === 'success', [fin.amountNegative]: card.tone === 'danger' }]"
            ) {{ card.value }}
            span(:class="fin.summaryDescription") {{ card.description }}

      dd-alert(info)
        strong Atraso calculado por vencimento efetivo
        p O número de dias em atraso considera a data já ajustada por domingos e dias não úteis cadastrados.

      dd-alert(
        v-if="requestError"
        danger
        title="Inadimplência"
      ) {{ requestError }}

      dd-table(
        v-if="!isEmpty"
        :columns="columns"
        :data="items"
        :loading="reportsStore.loading"
      )
        template(#cell-description="{ row }")
          dd-stack(compact nogap)
            strong {{ row.description }}
            span(v-if="row.scheduledDueDate !== row.effectiveDueDate" :class="fin.supportText")
              | Previsto originalmente para {{ formatDate(row.scheduledDueDate) }}

        template(#cell-contactName="{ row }")
          span {{ row.contactName || 'Sem contato' }}

        template(#cell-effectiveDueDate="{ row }")
          span {{ formatDate(row.effectiveDueDate) }}

        template(#cell-overdueDays="{ row }")
          span(:class="fin.overdueDays") {{ row.overdueDays }} dia(s)

        template(#cell-temperature="{ row }")
          dd-badge(
            :color="row.temperature === 'HIGH' ? 'danger' : row.temperature === 'MEDIUM' ? 'warning' : 'info'"
          ) {{ row.temperature === 'HIGH' ? 'Alta' : row.temperature === 'MEDIUM' ? 'Média' : 'Baixa' }}

        template(#cell-amount="{ row }")
          strong(:class="fin.amountNegative") {{ formatCurrency(row.amount) }}

      backoffice-empty-state(
        v-else
        icon="lucide:badge-alert"
        title="Nenhum dado encontrado"
        message="Não há lançamentos em atraso para o período selecionado."
      )
</template>

<style module="fin">
.toolbar {
  gap: v('space.md');
}

.periodNav {
  gap: v('space.xs');
}

.periodButton {
  min-inline-size: 12rem;
}

.referenceInfo {
  color: v('color.gray.700');
  font-size: v('font-size.sm');
}

.summaryGrid {
  --dd-grid-column-min-width: 16rem;
  --dd-grid-gap: v('space.md');
}

.summaryCard {
  --dd-card-border-color: v('color.border.standard');
  background: v('color.bg.surface');
  border: v('border-width.sm') solid var(--dd-card-border-color);
  border-radius: v('border-radius.lg');
  padding: v('space.md');
  text-align: start;
}

.summarySuccess {
  --dd-card-border-color: v('color.success.200');
}

.summaryDanger {
  --dd-card-border-color: v('color.danger.200');
}

.summaryWarning {
  --dd-card-border-color: v('color.warning.200');
}

.summaryInfo {
  --dd-card-border-color: v('color.info.200');
}

.summaryLabel {
  color: v('color.gray.700');
  font-size: v('font-size.sm');
}

.summaryDescription {
  color: v('color.gray.600');
  font-size: v('font-size.sm');
}

.amount {
  font-size: v('font-size.lg');
  line-height: v('line-height.tight');
}

.amountPositive {
  color: v('color.success.700');
}

.amountNegative {
  color: v('color.danger.700');
}

.supportText {
  color: v('color.gray.600');
  font-size: v('font-size.sm');
}

.overdueDays {
  color: v('color.gray.800');
  font-size: v('font-size.sm');
}
</style>
