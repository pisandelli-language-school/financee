<script setup lang="ts">
definePageMeta({
  layout: false,
})

const user = useSupabaseUser()
const route = useRoute()

const errorMessage = computed(() => {
  const message = route.query.error_description ?? route.query.error

  if (message) {
    console.error('Authentication error:', message)
    return 'Ocorreu um erro durante a autenticação. Por favor, tente novamente.'
  }

  return ''
})

watch(user, () => {
  if (user.value) {
    void navigateTo('/dashboard/financeiro')
  }
}, { immediate: true })
</script>

<template lang="pug">
main(:class="fin.page")
  dd-card(noborder :class="fin.card")
    dd-stack(compact)
      template(v-if="errorMessage")
        h1(:class="fin.title") Falha no login
        p(:class="fin.error") {{ errorMessage }}
        nuxt-link(:class="fin.backLink" to="/login") Voltar ao login
      template(v-else)
        dd-loading(label="Finalizando login...")
</template>

<style module="fin">
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: v('space.lg');
  background:
    radial-gradient(circle at top, color-mix(in srgb, v('color.primary') 16%, transparent), transparent 35%),
    linear-gradient(180deg, v('color.bg.surface') 0%, v('color.bg.subtle') 100%);
}

.card {
  width: min(100%, 420px);
  --dd-card-body-padding: v('space.xl');
  --dd-card-border-radius: v('border-radius.lg');
  --dd-card-box-shadow: v('shadow.xl');
}

.title {
  margin: 0;
  color: v('color.text.default');
  font-size: v('font-size.xl');
  line-height: v('line-height.tight');
}

.error {
  margin: 0;
  color: v('color.danger.700');
  font-size: v('font-size.sm');
  line-height: v('line-height.snug');
}

.backLink {
  color: v('color.primary');
  font-size: v('font-size.sm');
  font-weight: v('font-weight.semi-bold');
  text-decoration: none;
}
</style>
