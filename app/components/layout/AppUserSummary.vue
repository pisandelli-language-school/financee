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
}

.meta {
  font-size: v('font-size.sm');
  text-transform: capitalize;
}

.meta span {
  color: v('color.gray');
  font-size: v('font-size.xs');
}
</style>
