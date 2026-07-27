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
const periodLabel = computed(() => formatMonthLabel(visibleMonth.value))
const cards = computed(() => dashboardStore.operational?.cards ?? [])

await loadDashboard()
void persistPreferences()

watch(() => dashboardStore.filters.period, async (current, previous) => {
  if (current === previous) {
    return
  }

  await loadDashboard()
  void persistPreferences()
})

async function loadDashboard() {
  requestError.value = ''

  try {
    await dashboardStore.fetchOperational({
      dateFrom: toDateInput(startOfMonth(visibleMonth.value)),
      dateTo: toDateInput(endOfMonth(visibleMonth.value)),
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
  dashboardStore.setFilters({
    period: toMonthKey(shiftMonth(visibleMonth.value, -1)),
  })
}

function goToNextMonth() {
  dashboardStore.setFilters({
    period: toMonthKey(shiftMonth(visibleMonth.value, 1)),
  })
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

      dd-alert(v-if="requestError" danger title="Dashboard") {{ requestError }}

      dd-grid(:class="fin.cardsGrid")
        button(
          v-for="card in cards"
          :key="card.key ?? card.title"
          type="button"
          :class="[fin.metricCard, { [fin.metricSuccess]: card.tone === 'success', [fin.metricDanger]: card.tone === 'danger', [fin.metricWarning]: card.tone === 'warning', [fin.metricInfo]: card.tone === 'info' }]"
        )
          dd-stack(compact nogap)
            span(:class="fin.metricLabel") {{ card.title }}
            strong(:class="fin.metricValue") {{ card.value }}
</template>

<style module="fin">
.toolbar,
.viewTabs,
.periodNav {
  gap: v('space.md');
}

.periodButton {
  min-inline-size: 12rem;
}

.cardsGrid {
  --dd-grid-column-min-width: 14rem;
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

.metricLabel {
  color: v('color.gray.700');
  font-size: v('font-size.sm');
}

.metricValue {
  font-size: v('font-size.lg');
  line-height: v('line-height.tight');
}
</style>
