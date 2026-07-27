<script setup lang="ts">
import {
  contractBillingFrequencyOptions,
  contractBillingModelOptions,
  contractStatusOptions,
  type ContractRecord,
} from '~/types/contracts'

const props = defineProps<{
  open: boolean
  contract: ContractRecord | null
  loading?: boolean
}>()

defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

const statusMap = new Map(contractStatusOptions.map(option => [option.value, option.label]))
const billingModelMap = new Map(contractBillingModelOptions.map(option => [option.value, option.label]))
const billingFrequencyMap = new Map(contractBillingFrequencyOptions.map(option => [option.value, option.label]))

const billingDescription = computed(() => {
  if (!props.contract) {
    return '-'
  }

  const model = billingModelMap.get(props.contract.billingModel) ?? props.contract.billingModel

  if (props.contract.billingModel === 'CASH') {
    return model
  }

  const frequency = props.contract.billingFrequency
    ? (billingFrequencyMap.get(props.contract.billingFrequency) ?? props.contract.billingFrequency)
    : '-'
  const occurrences = props.contract.billingOccurrences ?? '-'

  return `${model} · ${frequency} · ${occurrences}`
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatStatus(value: ContractRecord['status']) {
  return statusMap.get(value) ?? value
}
</script>

<template lang="pug">
dd-modal(
  :open="open"
  title="Detalhes do contrato"
  @update:open="$emit('update:open', $event)"
)
  dd-stack(compact)
    dd-loading(v-if="loading") Carregando contrato...

    dd-stack(v-else-if="contract" compact)
      dd-card(flat)
        dd-stack(compact nogap)
          strong(:class="fin.title") {{ contract.title }}
          span(:class="fin.subcopy") {{ contract.clientName }}

      dd-grid
        dd-stack(compact nogap)
          span(:class="fin.label") Status
          span {{ formatStatus(contract.status) }}
        dd-stack(compact nogap)
          span(:class="fin.label") Cobrança
          span {{ billingDescription }}

      dd-grid
        dd-stack(compact nogap)
          span(:class="fin.label") Valor original
          strong {{ formatCurrency(contract.originalAmount) }}
        dd-stack(compact nogap)
          span(:class="fin.label") Desconto
          span {{ contract.discountAmount == null ? '-' : `${contract.discountAmount}%` }}
        dd-stack(compact nogap)
          span(:class="fin.label") Valor final
          strong {{ formatCurrency(contract.finalAmount) }}

      dd-grid
        dd-stack(compact nogap)
          span(:class="fin.label") Início
          span {{ contract.startDate }}
        dd-stack(compact nogap)
          span(:class="fin.label") Término previsto
          span {{ contract.expectedEndDate ?? '-' }}
        dd-stack(compact nogap v-if="contract.firstDueDate")
          span(:class="fin.label") Primeiro vencimento
          span {{ contract.firstDueDate }}

      dd-grid
        dd-stack(compact nogap)
          span(:class="fin.label") Horas totais
          span {{ contract.totalHours ?? '-' }}
        dd-stack(compact nogap)
          span(:class="fin.label") Horas semanais
          span {{ contract.weeklyHours ?? '-' }}
        dd-stack(compact nogap)
          span(:class="fin.label") Lançamentos vinculados
          span {{ contract.entriesCount }}

      dd-stack(compact nogap v-if="contract.notes")
        span(:class="fin.label") Observações
        p(:class="fin.notes") {{ contract.notes }}

  template(#footer)
    dd-cluster(end)
      dd-button(outline type="button" @click="$emit('update:open', false)") Fechar
</template>

<style module="fin">
.title {
  font-size: v('font-size.lg');
}

.subcopy,
.label {
  color: v('color.text.soft');
  font-size: v('font-size.sm');
}

.notes {
  margin: 0;
}
</style>
