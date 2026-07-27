<script setup lang="ts">
import { useDashboardStore } from '~~/stores/useDashboardStore'
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

const dashboardStore = useDashboardStore()
const preferencesStore = useUserPreferencesStore()
const { showToast } = useToaster()
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
const periodLabel = computed(() => formatMonthLabel(visibleMonth.value))
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

await loadDashboard()
void persistPreferences()

watch(() => [dashboardStore.filters.period, dashboardStore.filters.regime] as const, async (current, previous) => {
  if (current[0] === previous?.[0] && current[1] === previous?.[1]) {
    return
  }

  await loadDashboard()
  void persistPreferences()
})

async function loadDashboard() {
  requestError.value = ''

  try {
    await dashboardStore.fetchFinancial({
      dateFrom: toDateInput(startOfMonth(visibleMonth.value)),
      dateTo: toDateInput(endOfMonth(visibleMonth.value)),
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
  dashboardStore.setFilters({
    period: toMonthKey(shiftMonth(visibleMonth.value, -1)),
  })
}

function goToNextMonth() {
  dashboardStore.setFilters({
    period: toMonthKey(shiftMonth(visibleMonth.value, 1)),
  })
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

  dd-card
    dd-stack
      dd-cluster(between :class="fin.toolbar")
        dd-cluster(compact :class="fin.viewTabs")
          dd-button(
            v-for="view in viewOptions"
            :key="view.to"
            :primary="view.active"
            :outline="!view.active"
            :to="view.to"
          ) {{ view.label }}

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
            span(:class="fin.metricLabel") {{ card.title }}
            strong(
              :class="[fin.metricValue, { [fin.amountPositive]: card.tone === 'success', [fin.amountNegative]: card.tone === 'danger' }]"
            ) {{ typeof card.value === 'number' ? formatCurrency(card.value) : card.value }}

      dd-alert(v-if="requestError" danger title="Dashboard") {{ requestError }}

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
.toolbar {
  gap: v('space.md');
}

.viewTabs,
.periodNav {
  gap: v('space.xs');
}

.periodButton {
  min-inline-size: 12rem;
}

.cardsGrid,
.panelsGrid {
  --dd-grid-column-min-width: 16rem;
  --dd-grid-gap: v('space.md');
}

.metricCard {
  --dd-card-border-color: v('color.border.standard');
  background: v('color.bg.surface');
  border: v('border-width.sm') solid var(--dd-card-border-color);
  border-radius: v('border-radius.lg');
  padding: v('space.md');
  text-align: start;
}

.metricSuccess {
  --dd-card-border-color: v('color.success.200');
}

.metricDanger {
  --dd-card-border-color: v('color.danger.200');
}

.metricWarning {
  --dd-card-border-color: v('color.warning.200');
}

.metricInfo {
  --dd-card-border-color: v('color.info.200');
}

.metricLabel,
.supportLabel {
  color: v('color.gray.700');
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
</style>
