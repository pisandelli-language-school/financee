<script setup lang="ts">
withDefaults(defineProps<{
  editLabel?: string
  deleteLabel?: string
  showEdit?: boolean
  showDelete?: boolean
}>(), {
  editLabel: undefined,
  deleteLabel: undefined,
  showEdit: true,
  showDelete: true,
})

defineEmits<{
  (event: 'edit' | 'delete'): void
}>()

</script>

<template lang="pug">
dd-cluster(end :class="fin.actions")
  dd-button(
    v-if="showEdit"
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
    v-if="showDelete"
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
