<script setup lang="ts">
defineProps<{
  editLabel?: string
  deleteLabel?: string
}>()

defineEmits<{
  (event: 'edit'): void
  (event: 'delete'): void
}>()

const fin = useCssModule('fin')
</script>

<template lang="pug">
dd-cluster(end compact :class="fin.actions")
  button(
    type="button"
    :aria-label="editLabel ?? 'Editar'"
    :class="fin.action"
    @click="$emit('edit')"
  )
    icon(name="lucide:pencil")
  button(
    type="button"
    :aria-label="deleteLabel ?? 'Excluir'"
    :class="fin.action"
    @click="$emit('delete')"
  )
    icon(name="lucide:trash-2")
</template>

<style module="fin">
.action {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #73768c;
  cursor: pointer;
}

.actions {
  flex-wrap: nowrap;
}

.action:hover {
  background: #f7f8fc;
  color: #151a30;
}
</style>
