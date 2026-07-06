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

const fin = useCssModule('fin')
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
  gap: 12px;
}

h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
}

p {
  margin: 0;
  max-width: 720px;
  color: #73768c;
  line-height: 1.45;
}
</style>
