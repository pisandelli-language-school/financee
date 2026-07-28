<script setup lang="ts">
interface ActionButton {
  label: string
  icon?: string
}

defineProps<{
  breadcrumb: {
    routes: Array<{ label: string; to?: string }>
  }
  title: string
  description: string
  action?: ActionButton
}>()

defineEmits<{
  (event: 'action'): void
}>()

</script>

<template lang="pug">
dd-cluster(tag="header" between :class="fin.header")
  dd-stack(compact)
    dd-breadcrumb(:config="breadcrumb")
    h1 {{ title }}
    p {{ description }}

  dd-button(
    v-if="action"
    primary
    :icon="action.icon"
    @click="$emit('action')"
  ) {{ action.label }}
</template>

<style module="fin">
.header {
  align-items: flex-start;
  gap: v('space.sm');
}

h1 {
  margin: 0;
  font-size: v('font-size.xl');
  line-height: v('line-height.tight');
}

p {
  margin: 0;
  max-width: 720px;
  color: v('color.text.soft');
  line-height: v('line-height.snug');
}
</style>
