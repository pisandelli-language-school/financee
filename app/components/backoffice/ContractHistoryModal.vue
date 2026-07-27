<script setup lang="ts">
import {
  contractStatusOptions,
  type ContractHistoryRecord,
  type ContractStatus,
} from '~/types/contracts'

defineProps<{
  open: boolean
  title: string
  items: ContractHistoryRecord[]
  loading?: boolean
}>()

defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'view', id: string): void
}>()

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

function getRelationLabel(relation: ContractHistoryRecord['relation']) {
  if (relation === 'PREVIOUS') {
    return 'Anterior'
  }

  if (relation === 'NEXT') {
    return 'Renovação'
  }

  return 'Atual'
}

function getStatusLabel(status: ContractStatus) {
  return contractStatusOptions.find(option => option.value === status)?.label ?? status
}

function getStatusBadgeAttrs(status: ContractStatus) {
  switch (status) {
    case 'ACTIVE':
      return { success: true }

    case 'PROPOSAL':
      return { info: true }

    case 'RENEWED':
      return { primary: true, outline: true }

    case 'CLOSED':
      return { warning: true }

    case 'CANCELED':
      return { danger: true, outline: true }

    case 'LOCKED':
      return { info: true, outline: true }

    default:
      return { outline: true }
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)

  if (Number.isNaN(parsed.valueOf())) {
    return value
  }

  return dateFormatter.format(parsed)
}
</script>

<template lang="pug">
dd-modal(
  :open="open"
  :title="title"
  @update:open="$emit('update:open', $event)"
)
  dd-stack(compact)
    dd-loading(v-if="loading") Carregando histórico...

    dd-stack(v-else compact)
      dd-stack(compact)
        template(v-for="(item, index) in items" :key="item.id")
          dd-card(flat :class="fin.timelineCard")
            dd-stack(compact)
              dd-cluster(between)
                dd-stack(compact nogap)
                  strong {{ item.title }}
                  span(:class="fin.meta")
                    | Início: {{ formatDate(item.startDate) }}
                    template(v-if="item.expectedEndDate")
                      |  · Término previsto: {{ formatDate(item.expectedEndDate) }}
                dd-cluster(compact)
                  dd-badge(outline) {{ getRelationLabel(item.relation) }}
                  dd-badge(v-bind="getStatusBadgeAttrs(item.status)") {{ getStatusLabel(item.status) }}
              dd-cluster(end)
                dd-button(
                  outline
                  tiny
                  type="button"
                  icon="lucide:eye"
                  @click="$emit('view', item.id)"
                ) Ver detalhes
          dd-cluster(
            v-if="index < items.length - 1"
            center
            :class="fin.timelineConnector"
          )
            icon(name="lucide:arrow-down")

  template(#footer)
    dd-cluster(end)
      dd-button(outline type="button" @click="$emit('update:open', false)") Fechar
</template>

<style module="fin">
.meta {
  color: v('color.text.soft');
  font-size: v('font-size.sm');
}

.timelineCard {
  inline-size: 100%;
}

.timelineConnector {
  color: v('color.gray.500');
  min-block-size: v('space.xs');
}
</style>
