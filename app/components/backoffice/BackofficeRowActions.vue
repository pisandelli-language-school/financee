<script setup lang="ts">
defineProps<{
  editLabel?: string
  deleteLabel?: string
}>()

defineEmits<{
  (event: 'edit'): void
  (event: 'delete'): void
}>()

</script>

<template lang="pug">
dd-cluster(end :class="fin.actions")
  dd-button(
    ghost
    tiny
    icon-only
    type="button"
    icon="lucide:pencil"
    primary
    :aria-label="editLabel ?? 'Editar'"
    @click="$emit('edit')"
  )
  dd-button(
    ghost
    tiny
    icon-only
    type="button"
    icon="lucide:trash-2"
    danger
    :aria-label="deleteLabel ?? 'Excluir'"
    @click="$emit('delete')"
  )
</template>

<style module="fin">
.actions {
  --dd-cluster-gap: v('space.xs');
  flex-wrap: nowrap;
}
</style>
