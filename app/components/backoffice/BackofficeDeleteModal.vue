<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
}>()

defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'confirm'): void
}>()
</script>

<template lang="pug">
dd-modal(
  :open="open"
  title="Excluir registro"
  @update:open="$emit('update:open', $event)"
)
  dd-stack(compact)
    h3 {{ title }}
    p.delete-description {{ description }}

  template(#footer)
    dd-cluster(end)
      dd-button(outline @click="$emit('update:open', false)") Cancelar
      dd-button(
        danger
        :disabled="loading"
        icon="lucide:trash-2"
        @click="$emit('confirm')"
      ) {{ confirmLabel ?? 'Excluir' }}
</template>

<style scoped>
h3,
.delete-description {
  margin: 0;
}

.delete-description {
  color: #73768c;
}
</style>
