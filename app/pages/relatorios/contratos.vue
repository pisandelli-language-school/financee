<script setup lang="ts">
import type { AppTableColumn } from '~/types/backoffice'
import { contractStatusOptions } from '~/types/contracts'
import type { ContractStatus } from '~/types/contracts'
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
    { label: 'Contratos' },
  ],
}

const columns: AppTableColumn[] = [
  { key: 'title', title: 'Contrato', width: '260px' },
  { key: 'clientName', title: 'Cliente', width: '180px' },
  { key: 'status', title: 'Status', width: '140px', align: 'center' },
  { key: 'startDate', title: 'Início', width: '130px' },
  { key: 'expectedEndDate', title: 'Término', width: '130px' },
  { key: 'finalAmount', title: 'Valor final', width: '140px' },
  { key: 'entriesCount', title: 'Lançamentos', width: '120px', align: 'center' },
]

const statusLabelMap = new Map(contractStatusOptions.map(option => [option.value, option.label]))
const isPersisting = ref(false)
const requestError = ref('')

reportsStore.setView('contratos')

if (!reportsStore.filters.period) {
  reportsStore.setFilters({
    period: toMonthKey(startOfMonth(new Date())),
  })
}

const visibleMonth = computed(() => parseMonthKey(reportsStore.filters.period) ?? startOfMonth(new Date()))
const periodLabel = computed(() => formatMonthLabel(visibleMonth.value))
const items = computed(() => reportsStore.contracts?.items ?? [])
const isEmpty = computed(() => !reportsStore.loading && !items.value.length)

await loadContracts()

watch(() => reportsStore.filters.period, async (current, previous) => {
  if (current === previous) {
    return
  }

  await loadContracts()
  void persistPreferences()
})

const summaryCards = computed(() => {
  const totals = reportsStore.contracts?.totals ?? {
    total: 0,
    active: 0,
    renewed: 0,
    locked: 0,
    canceled: 0,
    closed: 0,
    proposals: 0,
    drafts: 0,
  }

  return [
    {
      key: 'total',
      label: 'Contratos no período',
      value: String(totals.total),
      description: 'Contratos que cruzam o intervalo selecionado.',
      tone: 'info',
    },
    {
      key: 'active',
      label: 'Ativos e renovados',
      value: String(totals.active + totals.renewed),
      description: 'Base corrente apta para operação ou continuidade.',
      tone: 'success',
    },
    {
      key: 'attention',
      label: 'Demandam atenção',
      value: String(totals.locked + totals.canceled + totals.closed),
      description: 'Trancados, cancelados ou encerrados no recorte.',
      tone: totals.locked + totals.canceled + totals.closed > 0 ? 'warning' : 'info',
    },
  ] as const
})

async function loadContracts() {
  requestError.value = ''

  try {
    await reportsStore.fetchContracts({
      dateFrom: toDateInput(startOfMonth(visibleMonth.value)),
      dateTo: toDateInput(endOfMonth(visibleMonth.value)),
    })
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : 'Não foi possível carregar o relatório de contratos.'
  }
}

async function persistPreferences() {
  if (!import.meta.client || !preferencesStore.hydrated || isPersisting.value) {
    return
  }

  isPersisting.value = true

  try {
    await preferencesStore.updatePreferences({
      lastReportView: 'contratos',
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

function formatDate(value: string | null) {
  if (!value) {
    return 'Em aberto'
  }

  return finDate.format(new Date(`${value}T00:00:00.000Z`))
}

function getStatusLabel(status: ContractStatus) {
  return statusLabelMap.get(status) ?? status
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="breadcrumb"
    title="Relatório de contratos"
    description="Acompanhe a base contratual ativa no período, renovações e estados que exigem atenção."
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

      dd-grid(:class="fin.summaryGrid")
        button(
          v-for="card in summaryCards"
          :key="card.key"
          type="button"
          :class="[fin.summaryCard, { [fin.summarySuccess]: card.tone === 'success', [fin.summaryWarning]: card.tone === 'warning', [fin.summaryInfo]: card.tone === 'info' }]"
        )
          dd-stack(compact nogap)
            span(:class="fin.summaryLabel") {{ card.label }}
            strong(:class="fin.amount") {{ card.value }}
            span(:class="fin.summaryDescription") {{ card.description }}

      dd-alert(v-if="requestError" danger title="Contratos") {{ requestError }}

      dd-table(
        v-if="!isEmpty"
        compact
        :columns="columns"
        :data="items"
        :loading="reportsStore.loading"
      )
        template(#cell-title="{ row }")
          dd-stack(compact nogap)
            strong {{ row.title }}
            span(v-if="row.renewalOfTitle" :class="fin.supportText") Renovação de {{ row.renewalOfTitle }}

        template(#cell-status="{ row }")
          dd-badge(
            :color="row.status === 'ACTIVE' ? 'success' : row.status === 'RENEWED' ? 'info' : row.status === 'LOCKED' ? 'warning' : row.status === 'CANCELED' ? 'danger' : 'secondary'"
          ) {{ getStatusLabel(row.status) }}

        template(#cell-startDate="{ row }")
          span {{ formatDate(row.startDate) }}

        template(#cell-expectedEndDate="{ row }")
          span {{ formatDate(row.expectedEndDate) }}

        template(#cell-finalAmount="{ row }")
          strong {{ formatCurrency(row.finalAmount) }}

        template(#cell-entriesCount="{ row }")
          dd-badge(info) {{ row.entriesCount }}

      backoffice-empty-state(
        v-else
        icon="lucide:file-signature"
        title="Nenhum dado encontrado"
        message="Não há contratos que cruzem o período selecionado."
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

.summaryDescription,
.supportText {
  color: v('color.gray.600');
  font-size: v('font-size.sm');
}

.amount {
  font-size: v('font-size.lg');
  line-height: v('line-height.tight');
}
</style>
