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

const breadcrumb = {
  routes: [
    { label: 'Relatórios', to: '/relatorios' },
    { label: 'Fluxo de caixa' },
  ],
}

const columns: AppTableColumn[] = [
  { key: 'label', title: 'Período', width: '180px' },
  { key: 'realizedIncome', title: 'Entradas realizadas', width: '180px' },
  { key: 'realizedExpense', title: 'Saídas realizadas', width: '180px' },
  { key: 'realizedNet', title: 'Saldo realizado', width: '160px' },
  { key: 'projectedIncome', title: 'Entradas previstas', width: '180px' },
  { key: 'projectedExpense', title: 'Saídas previstas', width: '180px' },
  { key: 'projectedNet', title: 'Saldo previsto', width: '160px' },
]

const regimeOptions = [
  { label: 'Regime caixa', value: 'CASH' },
  { label: 'Regime competência', value: 'COMPETENCE' },
]

const isPersisting = ref(false)
const requestError = ref('')

reportsStore.setView('fluxo-caixa')

if (!reportsStore.filters.period) {
  reportsStore.setFilters({
    period: toMonthKey(startOfMonth(new Date())),
  })
}

function getVisibleMonth() {
  return parseMonthKey(reportsStore.filters.period) ?? startOfMonth(new Date())
}

const periodLabel = computed(() => formatMonthLabel(getVisibleMonth()))
const rows = computed(() => reportsStore.cashFlow?.buckets ?? [])
const isEmpty = computed(() => !reportsStore.loading && !rows.value.length)

await loadCashFlow()

watch(() => [reportsStore.filters.period, reportsStore.filters.regime] as const, async (current, previous) => {
  if (current[0] === previous?.[0] && current[1] === previous?.[1]) {
    return
  }

  await loadCashFlow()
  void persistPreferences()
})

const summaryCards = computed(() => {
  const totals = reportsStore.cashFlow?.totals ?? {
    realizedIncome: 0,
    realizedExpense: 0,
    realizedNet: 0,
    projectedIncome: 0,
    projectedExpense: 0,
    projectedNet: 0,
  }

  const projectedBalance = totals.realizedNet + totals.projectedNet

  return [
    {
      key: 'realized',
      label: 'Realizado',
      value: totals.realizedNet,
      description: 'Recebimentos e pagamentos já liquidados no período.',
      tone: totals.realizedNet >= 0 ? 'success' : 'danger',
    },
    {
      key: 'projected',
      label: 'Previsto firme',
      value: totals.projectedNet,
      description: 'Somente lançamentos já gerados e ainda em aberto.',
      tone: totals.projectedNet >= 0 ? 'info' : 'warning',
    },
    {
      key: 'balance',
      label: 'Saldo projetado',
      value: projectedBalance,
      description: 'Resultado do realizado somado ao previsto firme.',
      tone: projectedBalance >= 0 ? 'success' : 'danger',
    },
  ]
})

async function loadCashFlow() {
  requestError.value = ''

  try {
    await reportsStore.fetchCashFlow({
      dateFrom: toDateInput(startOfMonth(getVisibleMonth())),
      dateTo: toDateInput(endOfMonth(getVisibleMonth())),
    })
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : 'Não foi possível carregar o fluxo de caixa.'
  }
}

async function persistPreferences() {
  if (!import.meta.client || !preferencesStore.hydrated || isPersisting.value) {
    return
  }

  isPersisting.value = true

  try {
    await preferencesStore.updatePreferences({
      lastReportView: 'fluxo-caixa',
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

</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="breadcrumb"
    title="Fluxo de caixa"
    description="Compare realizado e previsto firme por período, com leitura mensal em caixa ou competência."
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
              :class="[fin.amount, { [fin.amountPositive]: card.value > 0, [fin.amountNegative]: card.value < 0 }]"
            ) {{ formatCurrency(card.value) }}
            span(:class="fin.summaryDescription") {{ card.description }}

      dd-alert(info)
        strong Leitura do previsto firme
        p Contratos sem lançamentos ainda não entram aqui. A camada de simulação permanece separada para evitar dupla contagem.

      dd-table(
        :columns="columns"
        :data="rows"
        :loading="reportsStore.loading"
        :is-invalid="Boolean(requestError)"
        :error-message="requestError"
      )
        template(#cell-realizedIncome="{ row }")
          span(
            :class="[fin.amount, { [fin.amountPositive]: row.realizedIncome > 0, [fin.amountNegative]: row.realizedIncome < 0 }]"
          ) {{ formatCurrency(row.realizedIncome) }}

        template(#cell-realizedExpense="{ row }")
          span(
            :class="[fin.amount, { [fin.amountPositive]: -row.realizedExpense > 0, [fin.amountNegative]: -row.realizedExpense < 0 }]"
          ) {{ formatCurrency(-row.realizedExpense) }}

        template(#cell-realizedNet="{ row }")
          strong(
            :class="[fin.amount, { [fin.amountPositive]: row.realizedNet > 0, [fin.amountNegative]: row.realizedNet < 0 }]"
          ) {{ formatCurrency(row.realizedNet) }}

        template(#cell-projectedIncome="{ row }")
          span(
            :class="[fin.amount, { [fin.amountPositive]: row.projectedIncome > 0, [fin.amountNegative]: row.projectedIncome < 0 }]"
          ) {{ formatCurrency(row.projectedIncome) }}

        template(#cell-projectedExpense="{ row }")
          span(
            :class="[fin.amount, { [fin.amountPositive]: -row.projectedExpense > 0, [fin.amountNegative]: -row.projectedExpense < 0 }]"
          ) {{ formatCurrency(-row.projectedExpense) }}

        template(#cell-projectedNet="{ row }")
          strong(
            :class="[fin.amount, { [fin.amountPositive]: row.projectedNet > 0, [fin.amountNegative]: row.projectedNet < 0 }]"
          ) {{ formatCurrency(row.projectedNet) }}

      backoffice-empty-state(
        v-if="isEmpty"
        title="Nenhum dado encontrado"
        message="Ainda não há lançamentos suficientes neste período para montar o fluxo de caixa."
      )
</template>

<style module="fin">
.toolbar {
  align-items: center;
  flex-wrap: wrap;
  gap: v('space.sm');
}

.periodNav {
  align-items: center;
}

.periodButton {
  min-inline-size: 11rem;
}

.summaryGrid {
  --dd-grid-column-min-width: 16rem;
  --dd-grid-gap: v('space.sm');
}

.summaryCard {
  --dd-card-border-color: v('color.border.standard');
  align-items: flex-start;
  background: v('color.bg.surface');
  border: v('border-width.sm') solid var(--dd-card-border-color);
  border-radius: v('border-radius.lg');
  cursor: default;
  display: flex;
  inline-size: 100%;
  padding: v('space.md');
  text-align: left;
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
  color: v('color.text.soft');
  font-size: v('font-size.sm');
}

.summaryDescription {
  color: v('color.text.soft');
  font-size: v('font-size.xs');
  line-height: v('line-height.snug');
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
</style>
