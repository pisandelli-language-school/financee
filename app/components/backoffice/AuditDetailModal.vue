<script setup lang="ts">
import type { AuditLogDetailRecord } from '~/types/auth'

const props = defineProps<{
  open: boolean
  entry: AuditLogDetailRecord | null
  loading?: boolean
  errorMessage?: string
}>()

defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

const sections = computed(() => [
  {
    key: 'metadata',
    title: 'Metadados',
    value: props.entry?.metadata ?? null,
  },
  {
    key: 'before',
    title: 'Antes',
    value: props.entry?.before ?? null,
  },
  {
    key: 'after',
    title: 'Depois',
    value: props.entry?.after ?? null,
  },
].filter(section => hasContent(section.value)))

function hasContent(value: Record<string, unknown> | null) {
  if (!value) {
    return false
  }

  return Object.keys(value).length > 0
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatJson(value: Record<string, unknown> | null) {
  if (!value) {
    return ''
  }

  return JSON.stringify(value, null, 2)
}
</script>

<template lang="pug">
dd-modal(
  :open="open"
  title="Detalhes da auditoria"
  @update:open="$emit('update:open', $event)"
)
  dd-stack(compact)
    dd-alert(
      v-if="errorMessage"
      danger
      title="Auditoria"
      :closable="false"
      icon
    ) {{ errorMessage }}

    template(v-if="loading")
      dd-center
        dd-loading(label="Carregando auditoria...")
    template(v-else-if="entry")
      dd-stack(compact)
        dd-grid
          dd-stack(compact nogap)
            dd-form-label Evento
            span {{ entry.eventType }}
          dd-stack(compact nogap)
            dd-form-label Ação
            span {{ entry.action }}
          dd-stack(compact nogap)
            dd-form-label Severidade
            dd-badge(:color="entry.severity === 'CRITICAL' ? 'danger' : entry.severity === 'WARNING' ? 'warning' : 'info'") {{ entry.severity }}
          dd-stack(compact nogap)
            dd-form-label Data
            span {{ formatDateTime(entry.createdAt) }}
          dd-stack(compact nogap)
            dd-form-label Entidade
            span {{ entry.entityLabel ?? `${entry.entityType} · ${entry.entityId}` }}
          dd-stack(compact nogap)
            dd-form-label Usuário
            span {{ entry.userEmail ?? 'Sistema' }}

        dd-accordion-group(v-if="sections.length")
          dd-accordion(v-for="section in sections" :key="section.key" :title="section.title")
            pre(:class="fin.jsonBlock") {{ formatJson(section.value) }}
        dd-alert(
          v-else
          info
          title="Sem detalhes adicionais"
          :closable="false"
          icon
        ) Esta entrada não possui antes, depois ou metadados registrados.

  template(#footer)
    dd-cluster(end)
      dd-button(outline @click="$emit('update:open', false)") Fechar
</template>

<style module="fin">
.jsonBlock {
  background: v('color.bg.subtle');
  border: v('border-width.sm') solid v('color.border.standard');
  border-radius: v('radius.md');
  font-size: v('font-size.sm');
  margin: 0;
  overflow: auto;
  padding: v('space.sm');
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
