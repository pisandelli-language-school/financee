<script setup lang="ts">
import {
  entryStatusOptions,
  entryTypeOptions,
  recurrenceFrequencyOptions,
  recurrenceTypeOptions,
  type FinancialEntryRecord,
} from '~/types/financial'

const props = defineProps<{
  open: boolean
  entry: FinancialEntryRecord | null
}>()

defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

const recurrenceDescription = computed(() => {
  const entry = props.entry

  if (!entry?.recurrenceGroupId || entry.recurrenceType === 'ONE_TIME') {
    return 'Lançamento único'
  }

  const recurrenceType = recurrenceTypeOptions.find(option => option.value === entry.recurrenceType)?.label ?? entry.recurrenceType
  const frequency = recurrenceFrequencyOptions.find(option => option.value === entry.recurrenceFrequency)?.label ?? entry.recurrenceFrequency
  const position = entry.recurrenceIndex
    ? entry.recurrenceTotal
      ? `${entry.recurrenceIndex}/${entry.recurrenceTotal}`
      : `${entry.recurrenceIndex}/sem prazo`
    : '-'

  return `${recurrenceType} - ${frequency} - ${position}`
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
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function statusLabel(value: string) {
  return entryStatusOptions.find(option => option.value === value)?.label ?? value
}

function typeLabel(value: string) {
  return entryTypeOptions.find(option => option.value === value)?.label ?? value
}

function directionLabel(value: string) {
  return value === 'INCOME' ? 'Entrada' : 'Saída'
}
</script>

<template lang="pug">
dd-modal(
  :open="open"
  :title="entry ? `Detalhes de ${entry.description}` : 'Detalhes do lançamento'"
  @update:open="$emit('update:open', $event)"
)
  dd-stack(v-if="entry" compact)
    dd-grid
      dd-stack(compact nogap)
        dd-form-label Direção
        dd-badge(
          :success="entry.direction === 'INCOME'"
          :danger="entry.direction === 'EXPENSE'"
        ) {{ directionLabel(entry.direction) }}
      dd-stack(compact nogap)
        dd-form-label Status
        dd-badge(
          :success="entry.status === 'PAID'"
          :warning="entry.status === 'OPEN'"
          :danger="entry.status === 'CANCELED'"
        ) {{ statusLabel(entry.status) }}
      dd-stack(compact nogap)
        dd-form-label Valor
        strong(:class="entry.direction === 'INCOME' ? fin.income : fin.expense") {{ formatCurrency(entry.amount) }}
      dd-stack(compact nogap)
        dd-form-label Natureza
        span {{ typeLabel(entry.type) }}

    dd-grid
      dd-stack(compact nogap)
        dd-form-label Contato
        span {{ entry.contactName ?? '-' }}
      dd-stack(compact nogap)
        dd-form-label Conta prevista
        span {{ entry.accountName }}
      dd-stack(compact nogap)
        dd-form-label Conta de pagamento
        span {{ entry.paymentAccountName ?? '-' }}
      dd-stack(compact nogap)
        dd-form-label Centro de custo
        span {{ entry.costCenterName ?? '-' }}

    dd-grid
      dd-stack(compact nogap)
        dd-form-label Categoria
        span {{ entry.categoryName ?? '-' }}
      dd-stack(compact nogap)
        dd-form-label Subcategoria
        span {{ entry.subcategoryName ?? '-' }}
      dd-stack(compact nogap)
        dd-form-label Tags
        span {{ entry.tagNames.length ? entry.tagNames.join(', ') : '-' }}
      dd-stack(compact nogap)
        dd-form-label Recorrência
        span {{ recurrenceDescription }}

    dd-grid
      dd-stack(compact nogap)
        dd-form-label Competência
        span {{ formatDate(entry.competenceDate) }}
      dd-stack(compact nogap)
        dd-form-label Vencimento planejado
        span {{ formatDate(entry.scheduledDueDate) }}
      dd-stack(compact nogap)
        dd-form-label Vencimento efetivo
        span {{ formatDate(entry.effectiveDueDate) }}
      dd-stack(compact nogap)
        dd-form-label Pagamento
        span {{ formatDate(entry.paymentDate) }}

    dd-stack(v-if="entry.notes" compact nogap)
      dd-form-label Observações
      p(:class="fin.notes") {{ entry.notes }}

    dd-alert(
      v-if="entry.scheduledDueDate !== entry.effectiveDueDate"
      info
      title="Vencimento ajustado"
      :closable="false"
      icon
    ) O vencimento efetivo foi ajustado porque a data planejada caiu em domingo ou em um dia não útil cadastrado.

  template(#footer)
    dd-cluster(end)
      dd-button(outline @click="$emit('update:open', false)") Fechar
</template>

<style module="fin">
.income {
  color: v('color.success.700');
}

.expense {
  color: v('color.danger.700');
}

.notes {
  margin: 0;
}
</style>
