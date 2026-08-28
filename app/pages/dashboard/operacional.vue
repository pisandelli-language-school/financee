<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { useDashboardStore } from '~~/stores/useDashboardStore'
import { useUserPreferencesStore } from '~~/stores/useUserPreferencesStore'
import { useDashboardChartColors } from '~/composables/useDashboardChartColors'
import {
  endOfMonth,
  formatMonthLabel,
  parseMonthKey,
  shiftMonth,
  startOfMonth,
  toDateInput,
  toMonthKey,
} from '~/utils/report-period'

const dashboardStore = useDashboardStore()
const preferencesStore = useUserPreferencesStore()
const { showToast } = useToaster()
const chartColors = useDashboardChartColors()

const breadcrumb = {
  routes: [{ label: 'Dashboard' }],
}

const viewOptions = [
  { label: 'Financeiro', to: '/dashboard/financeiro', active: false },
  { label: 'Operacional', to: '/dashboard/operacional', active: true },
]

const isPersisting = ref(false)
const requestError = ref('')

dashboardStore.setView('OPERATIONAL')

if (!dashboardStore.filters.period) {
  dashboardStore.setFilters({
    period: toMonthKey(startOfMonth(new Date())),
  })
}

const visibleMonth = computed(() => parseMonthKey(dashboardStore.filters.period) ?? startOfMonth(new Date()))
const selectedRange = computed(() => ({
  start: dashboardStore.filters.dateFrom || toDateInput(startOfMonth(visibleMonth.value)),
  end: dashboardStore.filters.dateTo || toDateInput(endOfMonth(visibleMonth.value)),
}))
const periodLabel = computed(() => formatPeriodLabel(selectedRange.value))
const cards = computed(() => dashboardStore.operational?.cards ?? [])
const operationalHistory = computed(() => dashboardStore.operational?.history ?? [])
const hasOperationalData = computed(() => cards.value.some(card => card.value !== 0))
const hasContractHistory = computed(() => operationalHistory.value.some(bucket => (
  bucket.activeContracts !== 0 || bucket.renewedContracts !== 0
)))
const hasEntryHistory = computed(() => operationalHistory.value.some(bucket => (
  bucket.openEntries !== 0 || bucket.paidEntries !== 0
)))
const operationalChartOption = computed<EChartsOption | undefined>(() => {
  if (!hasOperationalData.value) {
    return undefined
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      top: 16,
      right: 40,
      bottom: 16,
      left: 156,
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: {
        color: chartColors.value.muted,
      },
      splitLine: {
        lineStyle: {
          color: chartColors.value.grid,
          type: 'dashed',
        },
      },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: cards.value.map(card => card.title),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        color: chartColors.value.muted,
        width: 136,
        overflow: 'truncate',
      },
    },
    series: [
      {
        name: 'Indicadores',
        type: 'bar',
        barMaxWidth: 32,
        label: {
          show: true,
          position: 'right',
          color: chartColors.value.text,
        },
        data: cards.value.map(card => ({
          value: card.value,
          itemStyle: {
            color: getCardColor(card.tone),
          },
        })),
      },
    ],
  }
})
const operationalSummary = computed(() => {
  if (!hasOperationalData.value) {
    return ''
  }

  return `No período selecionado: ${cards.value.map(card => `${card.title}: ${card.value}`).join('; ')}.`
})
const contractsChartOption = computed(() => createMonthlyLineChartOption([
  {
    name: 'Contratos ativos',
    color: chartColors.value.financialIncome,
    values: operationalHistory.value.map(bucket => bucket.activeContracts),
  },
  {
    name: 'Renovações',
    color: chartColors.value.delinquencyLow,
    values: operationalHistory.value.map(bucket => bucket.renewedContracts),
  },
]))
const entriesChartOption = computed(() => createMonthlyLineChartOption([
  {
    name: 'Lançamentos em aberto',
    color: chartColors.value.delinquencyMedium,
    values: operationalHistory.value.map(bucket => bucket.openEntries),
  },
  {
    name: 'Lançamentos pagos',
    color: chartColors.value.financialIncome,
    values: operationalHistory.value.map(bucket => bucket.paidEntries),
  },
]))
const contractsHistorySummary = computed(() => {
  const latest = operationalHistory.value.at(-1)

  return latest
    ? `Em ${latest.label}, havia ${latest.activeContracts} contratos ativos e ${latest.renewedContracts} renovações.`
    : ''
})
const entriesHistorySummary = computed(() => {
  const latest = operationalHistory.value.at(-1)

  if (!latest) {
    return ''
  }

  const openLabel = latest.openEntries === 1 ? 'lançamento em aberto' : 'lançamentos em aberto'
  const paidLabel = latest.paidEntries === 1 ? 'lançamento pago' : 'lançamentos pagos'

  return `Em ${latest.label}, foram identificados ${latest.openEntries} ${openLabel} e ${latest.paidEntries} ${paidLabel}.`
})

await loadDashboard()
void persistPreferences()

watch(() => [dashboardStore.filters.dateFrom, dashboardStore.filters.dateTo] as const, async (current, previous) => {
  if (current[0] === previous?.[0] && current[1] === previous?.[1]) {
    return
  }

  await loadDashboard()
  void persistPreferences()
})

async function loadDashboard() {
  requestError.value = ''

  try {
    await dashboardStore.fetchOperational({
      dateFrom: selectedRange.value.start,
      dateTo: selectedRange.value.end,
    })
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : 'Não foi possível carregar o dashboard operacional.'
  }
}

async function persistPreferences() {
  if (!import.meta.client || !preferencesStore.hydrated || isPersisting.value) {
    return
  }

  isPersisting.value = true

  try {
    await preferencesStore.updatePreferences({
      dashboardDefaultView: 'OPERATIONAL',
    })
  } catch {
    showToast('Não foi possível salvar sua visão padrão do dashboard.', {
      title: 'Dashboard',
      type: 'error',
    })
  } finally {
    isPersisting.value = false
  }
}

function goToPreviousMonth() {
  setMonthRange(shiftMonth(visibleMonth.value, -1))
}

function goToNextMonth() {
  setMonthRange(shiftMonth(visibleMonth.value, 1))
}

function setMonthRange(month: Date) {
  dashboardStore.setFilters({
    period: toMonthKey(month),
    dateFrom: toDateInput(startOfMonth(month)),
    dateTo: toDateInput(endOfMonth(month)),
  })
}

function applyDateRange(range: { start: string, end: string }) {
  dashboardStore.setFilters({
    period: range.start.slice(0, 7),
    dateFrom: range.start,
    dateTo: range.end,
  })
}

function resetDateRange() {
  setMonthRange(startOfMonth(new Date()))
}

function formatPeriodLabel(range: { start: string, end: string }) {
  const start = new Date(`${range.start}T00:00:00.000Z`)
  const end = new Date(`${range.end}T00:00:00.000Z`)

  if (start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()) {
    return formatMonthLabel(start)
  }

  const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

function getCardColor(tone: string | undefined) {
  if (tone === 'success') {
    return chartColors.value.financialIncome
  }

  if (tone === 'danger') {
    return chartColors.value.financialExpense
  }

  if (tone === 'warning') {
    return chartColors.value.delinquencyMedium
  }

  if (tone === 'info') {
    return chartColors.value.delinquencyLow
  }

  return chartColors.value.financialNet
}

function createMonthlyLineChartOption(series: Array<{
  name: string
  color: string
  values: number[]
}>): EChartsOption | undefined {
  if (!operationalHistory.value.length) {
    return undefined
  }

  return {
    color: series.map(item => item.color),
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      bottom: 0,
      textStyle: {
        color: chartColors.value.muted,
      },
    },
    grid: {
      top: 24,
      right: 16,
      bottom: 48,
      left: 32,
    },
    xAxis: {
      type: 'category',
      data: operationalHistory.value.map(bucket => bucket.label),
      axisLine: {
        lineStyle: {
          color: chartColors.value.grid,
        },
      },
      axisTick: { show: false },
      axisLabel: {
        color: chartColors.value.muted,
        formatter: value => String(value).slice(0, 3),
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: {
        color: chartColors.value.muted,
      },
      splitLine: {
        lineStyle: {
          color: chartColors.value.grid,
          type: 'dashed',
        },
      },
    },
    series: series.map(item => ({
      name: item.name,
      type: 'line',
      smooth: true,
      data: item.values,
    })),
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="breadcrumb"
    title="Dashboard operacional"
    description="Acompanhe contratos, renovações, trancamentos e volume operacional do período."
  )

  dd-card
    dd-stack
      reporting-date-range-toolbar(
        :label="periodLabel"
        :model-value="selectedRange"
        @previous="goToPreviousMonth"
        @next="goToNextMonth"
        @confirm="applyDateRange"
        @reset="resetDateRange"
      )
        template(#start)
          dd-cluster(compact :class="fin.viewTabs")
            dd-button(
              v-for="view in viewOptions"
              :key="view.to"
              :primary="view.active"
              :outline="!view.active"
              :to="view.to"
            ) {{ view.label }}

      dd-alert(v-if="requestError" danger title="Dashboard") {{ requestError }}

      dd-grid(:class="fin.cardsGrid")
        button(
          v-for="card in cards"
          :key="card.key ?? card.title"
          type="button"
          :class="[fin.metricCard, { [fin.metricSuccess]: card.tone === 'success', [fin.metricDanger]: card.tone === 'danger', [fin.metricWarning]: card.tone === 'warning', [fin.metricInfo]: card.tone === 'info' }]"
        )
          dd-stack(compact nogap)
            strong(:class="fin.metricValue") {{ card.value }}
            span(:class="fin.metricLabel") {{ card.title }}

      dashboard-chart-panel(
        title="Distribuição dos indicadores operacionais"
        description="Volumes atuais dos principais indicadores do período selecionado."
        :option="operationalChartOption"
        :loading="dashboardStore.loading"
        :empty="!hasOperationalData"
        :error-message="requestError"
      )
        template(#summary)
          p(v-if="operationalSummary" :class="fin.chartSummary") {{ operationalSummary }}

      dd-grid(:class="fin.historyChartsGrid")
        dashboard-chart-panel(
          title="Evolução de contratos"
          description="Contratos ativos e renovações nos últimos seis meses."
          :option="contractsChartOption"
          :loading="dashboardStore.loading"
          :empty="!hasContractHistory"
          :error-message="requestError"
        )
          template(#summary)
            p(v-if="contractsHistorySummary" :class="fin.chartSummary") {{ contractsHistorySummary }}

        dashboard-chart-panel(
          title="Evolução de lançamentos"
          description="Lançamentos em aberto e pagos nos últimos seis meses."
          :option="entriesChartOption"
          :loading="dashboardStore.loading"
          :empty="!hasEntryHistory"
          :error-message="requestError"
        )
          template(#summary)
            p(v-if="entriesHistorySummary" :class="fin.chartSummary") {{ entriesHistorySummary }}
</template>

<style module="fin">
.viewTabs {
  gap: v('space.md');
}

.cardsGrid {
  --dd-grid-column-min-width: 10rem;
  --dd-grid-gap: v('space.md');
}

.historyChartsGrid {
  --dd-grid-column-min-width: 32rem;
  --dd-grid-gap: v('space.md');
}

.metricCard {
  --dd-card-border-color: v('color.border.default');
  background: v('color.bg.surface');
  border: v('border-width.sm') solid var(--dd-card-border-color);
  border-radius: v('border-radius.lg');
  padding: v('space.md');
  text-align: center;
}

.metricSuccess {
  --dd-card-border-color: v('color.border.default');
}

.metricDanger {
  --dd-card-border-color: v('color.border.default');
}

.metricWarning {
  --dd-card-border-color: v('color.border.default');
}

.metricInfo {
  --dd-card-border-color: v('color.border.default');
}

.metricLabel {
  color: v('color.text.muted');
  font-size: v('font-size.sm');
}

.metricValue {
  font-size: v('font-size.lg');
  line-height: v('line-height.tight');
}

.chartSummary {
  color: v('color.text.muted');
  font-size: v('font-size.sm');
  margin: 0;
}
</style>
