<script setup lang="ts">
defineProps<{
  label: string
}>()

defineEmits<{
  previous: []
  next: []
  select: []
}>()
</script>

<template lang="pug">
dd-cluster(:class="fin.root")
  dd-button(
    ghost
    small
    icon-only
    icon="lucide:chevron-left"
    type="button"
    aria-label="Mês anterior"
    @click="$emit('previous')"
  )
  slot(name="period")
    dd-button(
      ghost
      small
      type="button"
      :class="fin.label"
      @click="$emit('select')"
    ) {{ label }}
  dd-button(
    ghost
    small
    icon-only
    icon="lucide:chevron-right"
    type="button"
    aria-label="Próximo mês"
    @click="$emit('next')"
  )
</template>

<style module="fin">
.root {
  align-items: center;
  gap: v('space.xs');
}

.label {
  min-inline-size: 0;
}
</style>
