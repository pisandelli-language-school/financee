<script setup lang="ts">
import type { JobExecutionRecord } from '~/types/jobs'

defineProps<{
  open: boolean
  title: string
  loading: boolean
  errorMessage?: string
  executions: JobExecutionRecord[]
}>()

defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDuration(value: number | null) {
  if (value == null) {
    return '-'
  }

  if (value < 1000) {
    return `${value} ms`
  }

  return `${(value / 1000).toFixed(1)} s`
}

function getStatusLabel(value: JobExecutionRecord['status']) {
  switch (value) {
    case 'SUCCESS':
      return 'Sucesso'
    case 'FAILED':
      return 'Falha'
    case 'RUNNING':
      return 'Executando'
    case 'PARTIAL':
      return 'Parcial'
    case 'PENDING':
    default:
      return 'Pendente'
  }
}
</script>

<template lang="pug">
dd-modal(
  :open="open"
  size="lg"
  title="Histórico do job"
  @update:open="$emit('update:open', $event)"
)
  dd-stack(v-if="loading" compact)
    dd-loading(text="Carregando execuções...")

  dd-alert(
    v-else-if="errorMessage"
    danger
    title="Jobs"
  ) {{ errorMessage }}

  dd-stack(v-else compact)
    p {{ title }}

    dd-card(v-for="execution in executions" :key="execution.id")
      dd-stack(compact)
        dd-cluster(between)
          strong {{ getStatusLabel(execution.status) }}
          span {{ formatDateTime(execution.startedAt) }}

        dd-cluster(compact)
          span Duração: {{ formatDuration(execution.durationMs) }}
          span(v-if="execution.finishedAt") Finalizado: {{ formatDateTime(execution.finishedAt) }}

        p(v-if="execution.errorMessage") {{ execution.errorMessage }}

        pre(v-if="execution.metadata") {{ JSON.stringify(execution.metadata, null, 2) }}

    backoffice-empty-state(
      v-if="!executions.length"
      title="Nenhuma execução encontrada"
      message="Este job ainda não registrou execuções no ambiente atual."
    )
</template>
