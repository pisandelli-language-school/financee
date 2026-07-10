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
    void navigateTo('/configuracoes')
  }
}, { immediate: true })
</script>

<template lang="pug">
main.confirm
  dd-card.confirm__card
    dd-stack(compact)
      template(v-if="errorMessage")
        h1.confirm__title Falha no login
        p.confirm__error {{ errorMessage }}
        nuxt-link.confirm__back(to="/login") Voltar ao login
      template(v-else)
        dd-loading(label="Finalizando login...")
</template>

<style scoped>
.confirm {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(10, 81, 207, 0.16), transparent 35%),
    linear-gradient(180deg, #f6f8fc 0%, #e9edf7 100%);
}

.confirm__card {
  width: min(100%, 420px);
  padding: 32px;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.confirm__title {
  margin: 0;
  font-size: 24px;
  color: #151a30;
}

.confirm__error {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #b91c1c;
}

.confirm__back {
  font-size: 14px;
  font-weight: 600;
  color: #0a51cf;
  text-decoration: none;
}
</style>
