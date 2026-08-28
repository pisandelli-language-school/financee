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
const finCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const breadcrumb = {
  routes: [{ label: 'Dashboard' }],
}

const viewOptions = [
  { label: 'Financeiro', to: '/dashboard/financeiro', active: true },
  { label: 'Operacional', to: '/dashboard/operacional', active: false },
]

const regimeOptions = [
  { label: 'Regime caixa', value: 'CASH' },
  { label: 'Regime competência', value: 'COMPETENCE' },
]

const isPersisting = ref(false)
const requestError = ref('')

dashboardStore.setView('FINANCIAL')

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
const cards = computed(() => dashboardStore.financial?.cards ?? [])
const cashFlowTotals = computed(() => dashboardStore.financial?.cashFlowTotals ?? {
  realizedIncome: 0,
  realizedExpense: 0,
  realizedNet: 0,
  projectedIncome: 0,
  projectedExpense: 0,
  projectedNet: 0,
})
const delinquencyTotals = computed(() => dashboardStore.financial?.delinquencyTotals ?? {
  count: 0,
  amount: 0,
  low: 0,
  medium: 0,
  high: 0,
})
const hasDelinquency = computed(() => delinquencyTotals.value.count > 0)
const delinquencyChartOption = computed<EChartsOption | undefined>(() => {
  if (!hasDelinquency.value) {
    return undefined
  }

  return {
    color: [
      chartColors.value.delinquencyHigh,
      chartColors.value.delinquencyMedium,
      chartColors.value.delinquencyLow,
    ],
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} título(s) em atraso ({d}%)',
    },
    legend: {
      bottom: 0,
      textStyle: {
        color: chartColors.value.muted,
      },
    },
    series: [
      {
        name: 'Temperatura da inadimplência',
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '44%'],
        label: { show: false },
        data: [
          { name: 'Alta', value: delinquencyTotals.value.high },
          { name: 'Média', value: delinquencyTotals.value.medium },
          { name: 'Baixa', value: delinquencyTotals.value.low },
        ],
      },
    ],
  }
})
const delinquencySummary = computed(() => {
  if (!hasDelinquency.value) {
    return ''
  }

  const { count, amount, high, medium, low } = delinquencyTotals.value
  const titleLabel = count === 1 ? 'título em atraso' : 'títulos em atraso'

  return `Há ${count} ${titleLabel}, com exposição de ${formatCurrency(amount)}: ${high} em temperatura alta, ${medium} em temperatura média e ${low} em temperatura baixa.`
})
const cashFlowHistory = computed(() => dashboardStore.financial?.cashFlowHistory ?? [])
const hasCashFlowHistory = computed(() => cashFlowHistory.value.some(bucket => (
  bucket.realizedIncome !== 0 || bucket.realizedExpense !== 0 || bucket.realizedNet !== 0
)))
const cashFlowChartOption = computed<EChartsOption | undefined>(() => {
  if (!hasCashFlowHistory.value) {
    return undefined
  }

  return {
    color: [
      chartColors.value.financialIncome,
      chartColors.value.financialExpense,
      chartColors.value.financialNet,
    ],
    tooltip: {
      trigger: 'axis',
      valueFormatter: value => formatCurrency(Number(value)),
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
      left: 64,
    },
    xAxis: {
      type: 'category',
      data: cashFlowHistory.value.map(bucket => bucket.label),
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
      axisLabel: {
        color: chartColors.value.muted,
        formatter: value => formatCurrency(Number(value)),
      },
      splitLine: {
        lineStyle: {
          color: chartColors.value.grid,
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: 'Entradas realizadas',
        type: 'bar',
        data: cashFlowHistory.value.map(bucket => bucket.realizedIncome),
      },
      {
        name: 'Saídas realizadas',
        type: 'bar',
        data: cashFlowHistory.value.map(bucket => bucket.realizedExpense),
      },
      {
        name: 'Resultado líquido',
        type: 'line',
        smooth: true,
        data: cashFlowHistory.value.map(bucket => bucket.realizedNet),
      },
    ],
  }
})
const cashFlowHistorySummary = computed(() => {
  const firstBucket = cashFlowHistory.value[0]
  const lastBucket = cashFlowHistory.value.at(-1)

  if (!firstBucket || !lastBucket) {
    return ''
  }

  return `De ${firstBucket.label} a ${lastBucket.label}, as entradas realizadas somaram ${formatCurrency(cashFlowHistory.value.reduce((total, bucket) => total + bucket.realizedIncome, 0))}, as saídas realizadas somaram ${formatCurrency(cashFlowHistory.value.reduce((total, bucket) => total + bucket.realizedExpense, 0))} e o resultado líquido foi de ${formatCurrency(cashFlowHistory.value.reduce((total, bucket) => total + bucket.realizedNet, 0))}.`
})

await loadDashboard()
void persistPreferences()

watch(() => [dashboardStore.filters.dateFrom, dashboardStore.filters.dateTo, dashboardStore.filters.regime] as const, async (current, previous) => {
  if (current[0] === previous?.[0] && current[1] === previous?.[1] && current[2] === previous?.[2]) {
    return
  }

  await loadDashboard()
  void persistPreferences()
})

async function loadDashboard() {
  requestError.value = ''

  try {
    await dashboardStore.fetchFinancial({
      dateFrom: selectedRange.value.start,
      dateTo: selectedRange.value.end,
    })
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : 'Não foi possível carregar o dashboard financeiro.'
  }
}

async function persistPreferences() {
  if (!import.meta.client || !preferencesStore.hydrated || isPersisting.value) {
    return
  }

  isPersisting.value = true

  try {
    await preferencesStore.updatePreferences({
      dashboardDefaultView: 'FINANCIAL',
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

function setRegime(value: unknown) {
  dashboardStore.setFilters({
    regime: String(value) as 'CASH' | 'COMPETENCE',
  })
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

function formatCurrency(value: number) {
  return finCurrency.format(value)
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="breadcrumb"
    title="Dashboard financeiro"
    description="Tenha uma leitura executiva do resultado, do previsto firme e da exposição em atraso."
  )

  dd-card(elevated)
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
              small
              :primary="view.active"
              :outline="!view.active"
              :to="view.to"
            ) {{ view.label }}

        template(#end)
          dd-select(
            :model-value="dashboardStore.filters.regime"
            :options="regimeOptions"
            placeholder="Selecione o regime"
            no-message
            @update:model-value="setRegime"
      )

      dd-grid(:class="fin.cardsGrid")
        button(
          v-for="card in cards"
          :key="card.key ?? card.title"
          type="button"
          :class="[fin.metricCard, { [fin.metricSuccess]: card.tone === 'success', [fin.metricDanger]: card.tone === 'danger', [fin.metricWarning]: card.tone === 'warning', [fin.metricInfo]: card.tone === 'info' }]"
        )
          dd-stack(compact nogap)
            strong(
              :class="[fin.metricValue, { [fin.amountPositive]: card.tone === 'success', [fin.amountNegative]: card.tone === 'danger' }]"
            ) {{ typeof card.value === 'number' ? formatCurrency(card.value) : card.value }}
            span(:class="fin.metricLabel") {{ card.title }}

      dd-alert(v-if="requestError" danger title="Dashboard") {{ requestError }}

      dd-grid(:class="fin.chartsGrid")
        dashboard-chart-panel(
          title="Entradas, saídas e resultado líquido"
          description="Valores realizados nos últimos seis meses."
          :option="cashFlowChartOption"
          :loading="dashboardStore.loading"
          :empty="!hasCashFlowHistory"
          :error-message="requestError"
        )
          template(#summary)
            p(v-if="cashFlowHistorySummary" :class="fin.chartSummary") {{ cashFlowHistorySummary }}

        dashboard-chart-panel(
          title="Temperatura da inadimplência"
          description="Distribuição dos títulos em atraso no período selecionado."
          :option="delinquencyChartOption"
          :loading="dashboardStore.loading"
          :empty="!hasDelinquency"
          :error-message="requestError"
        )
          template(#summary)
            p(v-if="delinquencySummary" :class="fin.chartSummary") {{ delinquencySummary }}

      dd-grid(:class="fin.panelsGrid")
        dd-card(:class="fin.panel")
          dd-stack(compact)
            strong Fluxo consolidado
            dd-cluster(between)
              span(:class="fin.supportLabel") Entradas realizadas
              strong(:class="fin.amountPositive") {{ formatCurrency(cashFlowTotals.realizedIncome) }}
            dd-cluster(between)
              span(:class="fin.supportLabel") Saídas realizadas
              strong(:class="fin.amountNegative") {{ formatCurrency(cashFlowTotals.realizedExpense) }}
            dd-cluster(between)
              span(:class="fin.supportLabel") Entradas previstas
              strong(:class="fin.amountPositive") {{ formatCurrency(cashFlowTotals.projectedIncome) }}
            dd-cluster(between)
              span(:class="fin.supportLabel") Saídas previstas
              strong(:class="fin.amountNegative") {{ formatCurrency(cashFlowTotals.projectedExpense) }}

        dd-card(:class="fin.panel")
          dd-stack(compact)
            strong Inadimplência do período
            dd-cluster(between)
              span(:class="fin.supportLabel") Títulos em atraso
              strong {{ delinquencyTotals.count }}
            dd-cluster(between)
              span(:class="fin.supportLabel") Valor exposto
              strong(:class="fin.amountNegative") {{ formatCurrency(delinquencyTotals.amount) }}
            dd-cluster(between)
              span(:class="fin.supportLabel") Temperatura alta
              dd-badge(danger) {{ delinquencyTotals.high }}
            dd-cluster(between)
              span(:class="fin.supportLabel") Temperatura média
              dd-badge(warning) {{ delinquencyTotals.medium }}
            dd-cluster(between)
              span(:class="fin.supportLabel") Temperatura baixa
              dd-badge(info) {{ delinquencyTotals.low }}
</template>

<style module="fin">
.viewTabs {
  gap: v('space.xs');
}

.panelsGrid {
  --dd-grid-column-min-width: 16rem;
  --dd-grid-gap: v('space.md');
}

.cardsGrid {
  --dd-grid-column-min-width: 10rem;
  --dd-grid-gap: v('space.md');
}

.chartsGrid {
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

.metricLabel,
.supportLabel {
  color: v('color.text.muted');
  font-size: v('font-size.sm');
}

.metricValue {
  font-size: v('font-size.lg');
  line-height: v('line-height.tight');
}

.amountPositive {
  color: v('color.success.700');
}

.amountNegative {
  color: v('color.danger.700');
}

.panel {
  padding: v('space.md');
}

.chartSummary {
  color: v('color.text.muted');
  font-size: v('font-size.sm');
  margin: 0;
}
</style>
