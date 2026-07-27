<script setup lang="ts">
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

const breadcrumb = {
  routes: [
    { label: 'Relatórios', to: '/relatorios' },
    { label: 'DRE' },
  ],
}

const regimeOptions = [
  { label: 'Regime caixa', value: 'CASH' },
  { label: 'Regime competência', value: 'COMPETENCE' },
]

const isPersisting = ref(false)
const requestError = ref('')

reportsStore.setView('dre')

if (!reportsStore.filters.period) {
  reportsStore.setFilters({
    period: toMonthKey(startOfMonth(new Date())),
  })
}

const visibleMonth = computed(() => parseMonthKey(reportsStore.filters.period) ?? startOfMonth(new Date()))
const periodLabel = computed(() => formatMonthLabel(visibleMonth.value))
const groups = computed(() => reportsStore.dre?.groups ?? [])
const isEmpty = computed(() => !reportsStore.loading && !groups.value.length)

await loadDre()

watch(() => [reportsStore.filters.period, reportsStore.filters.regime] as const, async (current, previous) => {
  if (current[0] === previous?.[0] && current[1] === previous?.[1]) {
    return
  }

  await loadDre()
  void persistPreferences()
})

const summaryCards = computed(() => {
  const totals = reportsStore.dre?.totals ?? {
    income: 0,
    expense: 0,
    net: 0,
  }

  return [
    {
      key: 'income',
      label: 'Receitas',
      value: totals.income,
      description: 'Entradas classificadas no período selecionado.',
      tone: 'success',
    },
    {
      key: 'expense',
      label: 'Despesas',
      value: totals.expense,
      description: 'Saídas classificadas no período selecionado.',
      tone: 'danger',
    },
    {
      key: 'net',
      label: 'Resultado',
      value: totals.net,
      description: 'Receitas menos despesas conforme o regime atual.',
      tone: totals.net >= 0 ? 'info' : 'warning',
    },
  ] as const
})

async function loadDre() {
  requestError.value = ''

  try {
    await reportsStore.fetchDre({
      dateFrom: toDateInput(startOfMonth(visibleMonth.value)),
      dateTo: toDateInput(endOfMonth(visibleMonth.value)),
    })
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : 'Não foi possível carregar o DRE.'
  }
}

async function persistPreferences() {
  if (!import.meta.client || !preferencesStore.hydrated || isPersisting.value) {
    return
  }

  isPersisting.value = true

  try {
    await preferencesStore.updatePreferences({
      lastReportView: 'dre',
      lastReportPeriod: reportsStore.filters.period,
      lastReportRegime: reportsStore.filters.regime,
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

function setRegime(value: unknown) {
  reportsStore.setFilters({
    regime: String(value) as 'CASH' | 'COMPETENCE',
  })
}

function goToPreviousMonth() {
  reportsStore.setFilters({
    period: toMonthKey(shiftMonth(visibleMonth.value, -1)),
  })
}

function goToNextMonth() {
  reportsStore.setFilters({
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
    title="DRE"
    description="Acompanhe receitas, despesas e resultado gerencial por grupo e categoria."
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

        dd-select(
          :model-value="reportsStore.filters.regime"
          :options="regimeOptions"
          placeholder="Selecione o regime"
          no-message
          @update:model-value="setRegime"
        )

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
              :class="[fin.amount, { [fin.amountPositive]: card.key === 'income' || (card.key === 'net' && card.value > 0), [fin.amountNegative]: card.key === 'expense' || (card.key === 'net' && card.value < 0) }]"
            ) {{ formatCurrency(card.value) }}
            span(:class="fin.summaryDescription") {{ card.description }}

      dd-alert(info)
        strong Classificação residual visível
        p Tudo o que estiver sem grupo DRE, ou sem categoria, aparece em "Não classificado". Transferências ficam fora do DRE por não comporem resultado.

      dd-alert(
        v-if="requestError"
        danger
        title="DRE"
      ) {{ requestError }}

      backoffice-empty-state(
        v-if="isEmpty"
        icon="lucide:chart-no-axes-column"
        title="Nenhum dado encontrado"
        message="Ainda não há lançamentos suficientes neste período para montar o DRE."
      )

      dd-accordion-group(v-else)
        dd-accordion(
          v-for="group in groups"
          :key="group.key"
          :title="`${group.label} · ${formatCurrency(group.amount)}`"
        )
          dd-stack(compact)
            dd-cluster(
              v-for="category in group.categories"
              :key="category.categoryId ?? category.categoryName"
              between
              :class="fin.categoryRow"
            )
              span(:class="fin.categoryName") {{ category.categoryName }}
              strong(
                :class="[fin.categoryAmount, { [fin.amountPositive]: category.amount > 0, [fin.amountNegative]: category.amount < 0 }]"
              ) {{ formatCurrency(category.amount) }}
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

.categoryRow {
  border-bottom: v('border-width.sm') solid v('color.border.subtle');
  gap: v('space.md');
  padding-block: v('space.xs');
}

.categoryRow:last-child {
  border-bottom: 0;
}

.categoryName {
  color: v('color.gray.800');
}

.categoryAmount {
  font-size: v('font-size.sm');
}
</style>
