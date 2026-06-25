<script setup lang="ts">
// Entry route. The global auth middleware redirects:
//   authenticated → /configuracoes · unauthenticated → /login
definePageMeta({
  layout: false,
})
</script>

<template lang="pug">
main.entry
  dd-loading(label="Carregando...")
</template>

<style scoped>
.entry {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #f6f8fc 0%, #e9edf7 100%);
}
</style>
