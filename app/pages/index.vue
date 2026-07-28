<script setup lang="ts">
// Entry route. The global auth middleware redirects:
//   authenticated → /dashboard/financeiro · unauthenticated → /login
definePageMeta({
  layout: false,
})
</script>

<template lang="pug">
main(:class="fin.entry")
  dd-loading(label="Carregando...")
</template>

<style module="fin">
.entry {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top, color-mix(in srgb, v('color.primary') 10%, transparent), transparent 35%),
    linear-gradient(180deg, v('color.bg.surface') 0%, v('color.bg.subtle') 100%);
}
</style>
