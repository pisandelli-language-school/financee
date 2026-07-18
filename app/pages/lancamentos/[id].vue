<script setup lang="ts">
import { FinancialEntriesModule } from '~/api/financial'

const route = useRoute()
const entryId = computed(() => String(route.params.id ?? ''))

const pageMeta = {
  title: 'Lançamento',
  description: 'Consulte os dados-base do lançamento antes de avançarmos para edição, pagamento e recorrência.',
}

const breadcrumb = computed(() => ({
  routes: [
    { label: 'Lançamentos', to: '/lancamentos' },
    { label: 'Detalhes' },
  ],
}))

const entry = await FinancialEntriesModule.get(entryId.value)

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
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="breadcrumb"
    :title="entry.description"
    :description="pageMeta.description"
  )

  dd-card
    dd-grid
      dd-stack(compact nogap)
        dd-form-label Direção
        span {{ entry.direction === 'INCOME' ? 'Entrada' : 'Saída' }}
      dd-stack(compact nogap)
        dd-form-label Status
        span {{ entry.status }}
      dd-stack(compact nogap)
        dd-form-label Valor
        strong {{ formatCurrency(entry.amount) }}
      dd-stack(compact nogap)
        dd-form-label Conta
        span {{ entry.accountName }}
      dd-stack(compact nogap)
        dd-form-label Categoria
        span {{ entry.categoryName ?? '-' }}
      dd-stack(compact nogap)
        dd-form-label Subcategoria
        span {{ entry.subcategoryName ?? '-' }}
      dd-stack(compact nogap)
        dd-form-label Contato
        span {{ entry.contactName ?? '-' }}
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
      dd-stack(compact nogap)
        dd-form-label Tags
        span {{ entry.tagNames.length ? entry.tagNames.join(', ') : '-' }}

  dd-alert(
    info
    title="Próximos passos"
    :closable="false"
    icon
  ) Edição, mudança de status, recorrência e transferências entram nos próximos blocos da implementação.
</template>
