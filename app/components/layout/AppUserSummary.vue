<script setup lang="ts">
defineProps<{
  userName: string
  roleLabel?: string
}>()
</script>

<template lang="pug">
dd-cluster(narrow :class="fin.root")
  dd-avatar(:alt="userName" small)
  dd-stack(nogap :class="fin.meta")
    strong {{ userName }}
    span {{ roleLabel ?? 'Administrador' }}
</template>

<style module="fin">
.root {
  --dd-cluster-gap: v('space.xxs');
  color: v('color.text.default');
}

.meta {
  color: inherit;
  font-size: v('font-size.sm');
  text-transform: capitalize;
}

.meta strong {
  color: inherit;
  font-weight: v('font-weight.semi-bold');
}

.meta span {
  color: v('color.text.muted');
  font-size: v('font-size.xs');
  line-height: v('line-height.tight');
}
</style>
