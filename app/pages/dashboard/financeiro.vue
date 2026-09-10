<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { useDashboardStore } from '~~/stores/useDashboardStore'
import { useUserPreferencesStore } from '~~/stores/useUserPreferencesStore'
import { useDashboardChartColors } from '~/composables/useDashboardChartColors'
import { getAccountInitials, getInstitutionLogoByKey } from '~/utils/account-institutions'
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
const hasPendingPreferences = ref(false)
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
const accountBalances = computed(() => dashboardStore.financial?.accountBalances ?? [])
const currentBalance = computed(() => accountBalances.value.reduce((total, account) => total + account.balance, 0))
const hasCashFlowTotals = computed(() => (
  cashFlowTotals.value.realizedIncome !== 0
  || cashFlowTotals.value.realizedExpense !== 0
  || cashFlowTotals.value.projectedIncome !== 0
  || cashFlowTotals.value.projectedExpense !== 0
))
const weeklyBillsChartOption = computed<EChartsOption | undefined>(() => {
  if (!hasCashFlowTotals.value) {
    return undefined
  }

  return {
    color: [chartColors.value.financialIncome, chartColors.value.financialExpense],
    tooltip: {
      trigger: 'item',
      show: !dashboardStore.isValueHidden,
      valueFormatter: value => formatCurrency(Number(value)),
    },
    legend: {
      bottom: 0,
      textStyle: { color: chartColors.value.muted },
    },
    series: [
      {
        name: 'Contas do período',
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '44%'],
        label: { show: false },
        data: [
          { name: 'Entradas', value: cashFlowTotals.value.realizedIncome + cashFlowTotals.value.projectedIncome },
          { name: 'Saídas', value: cashFlowTotals.value.realizedExpense + cashFlowTotals.value.projectedExpense },
        ],
      },
    ],
  }
})
const weeklyBillsSummary = computed(() => {
  if (!hasCashFlowTotals.value) {
    return ''
  }

  const income = cashFlowTotals.value.realizedIncome + cashFlowTotals.value.projectedIncome
  const expense = cashFlowTotals.value.realizedExpense + cashFlowTotals.value.projectedExpense

  return `No período selecionado, foram ${formatCurrency(income)} em entradas e ${formatCurrency(expense)} em saídas, considerando valores realizados e previstos firmes.`
})
const delinquencyTotals = computed(() => dashboardStore.financial?.delinquencyTotals ?? {
  count: 0,
  amount: 0,
  low: 0,
  medium: 0,
  high: 0,
})
const cashFlowHistory = computed(() => dashboardStore.financial?.cashFlowHistory ?? [])
const hasCashFlowHistory = computed(() => cashFlowHistory.value.some(bucket => (
  bucket.realizedIncome !== 0
  || bucket.realizedExpense !== 0
  || bucket.projectedIncome !== 0
  || bucket.projectedExpense !== 0
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
      show: !dashboardStore.isValueHidden,
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
        name: 'Entradas',
        type: 'bar',
        data: cashFlowHistory.value.map(bucket => bucket.realizedIncome + bucket.projectedIncome),
      },
      {
        name: 'Saídas',
        type: 'bar',
        data: cashFlowHistory.value.map(bucket => bucket.realizedExpense + bucket.projectedExpense),
      },
      {
        name: 'Resultado líquido',
        type: 'line',
        smooth: true,
        data: cashFlowHistory.value.map(bucket => bucket.realizedNet + bucket.projectedNet),
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

  const income = cashFlowHistory.value.reduce((total, bucket) => total + bucket.realizedIncome + bucket.projectedIncome, 0)
  const expense = cashFlowHistory.value.reduce((total, bucket) => total + bucket.realizedExpense + bucket.projectedExpense, 0)
  const net = cashFlowHistory.value.reduce((total, bucket) => total + bucket.realizedNet + bucket.projectedNet, 0)

  return `De ${firstBucket.label} a ${lastBucket.label}, as entradas somaram ${formatCurrency(income)}, as saídas somaram ${formatCurrency(expense)} e o resultado líquido foi de ${formatCurrency(net)}.`
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
  if (!import.meta.client || !preferencesStore.hydrated) {
    return
  }

  if (isPersisting.value) {
    hasPendingPreferences.value = true
    return
  }

  isPersisting.value = true

  try {
    await preferencesStore.updatePreferences({
      dashboardDefaultView: 'FINANCIAL',
      lastReportRegime: dashboardStore.filters.regime,
    })
  } catch {
    showToast('Não foi possível salvar sua visão padrão do dashboard.', {
      title: 'Dashboard',
      type: 'error',
    })
  } finally {
    isPersisting.value = false

    if (hasPendingPreferences.value) {
      hasPendingPreferences.value = false
      await persistPreferences()
    }
  }
}

function setRegime(value: unknown) {
  dashboardStore.setFilters({
    regime: String(value) as 'CASH' | 'COMPETENCE',
  })
}

function toggleValueVisibility() {
  dashboardStore.toggleValueVisibility()
}

function accountLogo(logoKey: string | null) {
  return getInstitutionLogoByKey(logoKey)
}

function accountSubtitle(account: { institutionName: string | null, type: string }) {
  return account.institutionName ?? account.type
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
  if (dashboardStore.isValueHidden) {
    return '••••'
  }

  return finCurrency.format(value)
}

function formatNumber(value: number) {
  return dashboardStore.isValueHidden ? '••••' : String(value)
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
            dd-button(
              small
              icon-only
              :primary="dashboardStore.isValueHidden"
              :ghost="!dashboardStore.isValueHidden"
              :icon="dashboardStore.isValueHidden ? 'lucide:eye-off' : 'lucide:eye'"
              :aria-label="dashboardStore.isValueHidden ? 'Mostrar valores do dashboard' : 'Ocultar valores do dashboard'"
              :aria-pressed="dashboardStore.isValueHidden"
              type="button"
              @click="toggleValueVisibility"
            )

        template(#end)
          dd-select(
            :model-value="dashboardStore.filters.regime"
            :options="regimeOptions"
            placeholder="Selecione o regime"
            no-message
            small
            @update:model-value="setRegime"
      )

      dd-grid(:class="fin.cardsGrid")
        dd-card(:class="fin.balanceCard")
          dd-stack(compact)
            dd-cluster(between :class="fin.balanceHeader")
              strong Saldo de hoje
              dd-popover(trigger="click" placement="bottom-end")
                span(:class="fin.popoverTrigger")
                  dd-button(
                    ghost
                    tiny
                    icon-only
                    icon="lucide:ellipsis-vertical"
                    type="button"
                    aria-label="Ver composição do saldo"
                  )
                template(#content)
                  dd-stack(v-if="accountBalances.length" compact :class="fin.balancePopover")
                    dd-cluster(
                      v-for="account in accountBalances"
                      :key="account.id"
                      between
                      :class="fin.balanceAccount"
                    )
                      dd-cluster(compact :class="fin.balanceAccountIdentity")
                        dd-avatar(
                          v-if="accountLogo(account.institutionLogoKey)"
                          :src="accountLogo(account.institutionLogoKey)"
                          :alt="accountSubtitle(account)"
                          :class="fin.accountAvatar"
                        )
                        span(v-else :class="fin.accountInitials") {{ getAccountInitials(account.institutionName || account.name) }}
                        dd-stack(compact nogap)
                          strong {{ account.name }}
                          span(:class="fin.supportLabel") {{ accountSubtitle(account) }}
                      strong {{ formatCurrency(account.balance) }}
                  span(v-else :class="fin.supportLabel") Nenhuma conta ativa cadastrada.
            strong(:class="fin.balanceValue") {{ formatCurrency(currentBalance) }}

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
          description="Valores realizados e previstos firmes no período selecionado."
          :option="cashFlowChartOption"
          :loading="dashboardStore.loading"
          :empty="!hasCashFlowHistory"
          :error-message="requestError"
        )
          template(#summary)
            p(v-if="cashFlowHistorySummary" :class="fin.chartSummary") {{ cashFlowHistorySummary }}

        dashboard-chart-panel(
          title="Contas do período"
          description="Distribuição das entradas e saídas no período selecionado."
          :option="weeklyBillsChartOption"
          :loading="dashboardStore.loading"
          :empty="!hasCashFlowTotals"
          :error-message="requestError"
        )
          template(#summary)
            p(v-if="weeklyBillsSummary" :class="fin.chartSummary") {{ weeklyBillsSummary }}

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
              strong {{ formatNumber(delinquencyTotals.count) }}
            dd-cluster(between)
              span(:class="fin.supportLabel") Valor exposto
              strong(:class="fin.amountNegative") {{ formatCurrency(delinquencyTotals.amount) }}
            dd-cluster(between)
              span(:class="fin.supportLabel") Temperatura alta
              dd-badge(danger) {{ formatNumber(delinquencyTotals.high) }}
            dd-cluster(between)
              span(:class="fin.supportLabel") Temperatura média
              dd-badge(warning) {{ formatNumber(delinquencyTotals.medium) }}
            dd-cluster(between)
              span(:class="fin.supportLabel") Temperatura baixa
              dd-badge(info) {{ formatNumber(delinquencyTotals.low) }}
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
  --dd-grid-column-min-width: 12rem;
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

.balanceCard {
  --dd-card-border-radius: v('border-radius.lg');
  --dd-card-body-padding: v('space.md');
}

.balanceHeader {
  align-items: center;
}

.balanceValue {
  font-size: v('font-size.lg');
  line-height: v('line-height.tight');
}

.balanceAccount,
.balanceAccountIdentity {
  align-items: center;
}

.balanceAccountIdentity {
  min-inline-size: 0;
}

.accountAvatar {
  --dd-avatar-background-color: transparent;

  flex: 0 0 1.75rem;
}

.accountInitials {
  align-items: center;
  background: v('color.primary');
  border-radius: 999px;
  color: v('color.text.inverted');
  display: inline-flex;
  flex: 0 0 1.75rem;
  font-size: v('font-size.xs');
  font-weight: v('font-weight.semi-bold');
  inline-size: 1.75rem;
  justify-content: center;
  text-transform: uppercase;
}

.balancePopover {
  --dd-stack-gap: v('space.xs');

  min-inline-size: 16rem;
}

.balancePopover .balanceAccount {
  gap: v('space.lg');
}

.balancePopover .balanceAccount strong {
  font-size: v('font-size.sm');
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

.supportLabel {
  color: v('color.text.muted');
  font-size: v('font-size.sm');
}

.metricLabel {
  color: v('color.text.muted');
  font-size: v('font-size.xs');
}

.metricValue {
  font-size: v('font-size.md');
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
