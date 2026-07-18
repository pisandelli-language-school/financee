<script setup lang="ts">
import { FinancialEntriesModule } from '~/api/financial'
import {
  entryStatusOptions,
  recurrenceFrequencyOptions,
  recurrenceTypeOptions,
} from '~/types/financial'

const route = useRoute()
const entryId = computed(() => String(route.params.id ?? ''))

const pageMeta = {
  title: 'Lançamento',
  description: 'Consulte os dados operacionais, vínculos e recorrência deste lançamento.',
}

const breadcrumb = computed(() => ({
  routes: [
    { label: 'Lançamentos', to: '/lancamentos' },
    { label: 'Detalhes' },
  ],
}))

const entry = await FinancialEntriesModule.get(entryId.value)

const recurrenceDescription = computed(() => {
  if (!entry.recurrenceGroupId || entry.recurrenceType === 'ONE_TIME') {
    return 'Lançamento único'
  }

  const recurrenceType = recurrenceTypeOptions.find(option => option.value === entry.recurrenceType)?.label ?? entry.recurrenceType
  const frequency = recurrenceFrequencyOptions.find(option => option.value === entry.recurrenceFrequency)?.label ?? entry.recurrenceFrequency
  const position = entry.recurrenceIndex
    ? entry.recurrenceTotal
      ? `${entry.recurrenceIndex}/${entry.recurrenceTotal}`
      : `${entry.recurrenceIndex}/sem prazo`
    : '-'

  return `${recurrenceType} • ${frequency} • ${position}`
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function statusLabel(value: string) {
  return entryStatusOptions.find(option => option.value === value)?.label ?? value
}

function statusColor(value: string) {
  if (value === 'PAID') {
    return 'success'
  }

  if (value === 'CANCELED') {
    return 'danger'
  }

  return 'warning'
}

function directionLabel(value: string) {
  return value === 'INCOME' ? 'Entrada' : 'Saída'
}

function directionColor(value: string) {
  return value === 'INCOME' ? 'success' : 'danger'
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="breadcrumb"
    :title="entry.description"
    :description="pageMeta.description"
  )

  dd-card
    dd-stack
      dd-grid
        dd-stack(compact nogap)
          strong Direção
          dd-badge(:color="directionColor(entry.direction)") {{ directionLabel(entry.direction) }}
        dd-stack(compact nogap)
          strong Status
          dd-badge(:color="statusColor(entry.status)") {{ statusLabel(entry.status) }}
        dd-stack(compact nogap)
          strong Valor
          span {{ formatCurrency(entry.amount) }}
        dd-stack(compact nogap)
          strong Tipo
          span {{ entry.type === 'TRANSFER' ? 'Transferência' : entry.type }}

      dd-grid
        dd-stack(compact nogap)
          strong Conta prevista
          span {{ entry.accountName }}
        dd-stack(compact nogap)
          strong Conta de pagamento
          span {{ entry.paymentAccountName ?? '-' }}
        dd-stack(compact nogap)
          strong Contato
          span {{ entry.contactName ?? '-' }}
        dd-stack(compact nogap)
          strong Centro de custo
          span {{ entry.costCenterName ?? '-' }}

      dd-grid
        dd-stack(compact nogap)
          strong Categoria
          span {{ entry.categoryName ?? '-' }}
        dd-stack(compact nogap)
          strong Subcategoria
          span {{ entry.subcategoryName ?? '-' }}
        dd-stack(compact nogap)
          strong Tags
          span {{ entry.tagNames.length ? entry.tagNames.join(', ') : '-' }}
        dd-stack(compact nogap)
          strong Recorrência
          span {{ recurrenceDescription }}

      dd-grid
        dd-stack(compact nogap)
          strong Competência
          span {{ formatDate(entry.competenceDate) }}
        dd-stack(compact nogap)
          strong Vencimento planejado
          span {{ formatDate(entry.scheduledDueDate) }}
        dd-stack(compact nogap)
          strong Vencimento efetivo
          span {{ formatDate(entry.effectiveDueDate) }}
        dd-stack(compact nogap)
          strong Pagamento
          span {{ formatDate(entry.paymentDate) }}

      dd-stack(v-if="entry.notes" compact nogap)
        strong Observações
        p {{ entry.notes }}

      dd-alert(
        v-if="entry.scheduledDueDate !== entry.effectiveDueDate"
        info
        title="Vencimento ajustado"
        :closable="false"
        icon
      ) O vencimento efetivo foi ajustado porque a data planejada caiu em domingo ou em um dia não útil cadastrado.
</template>
