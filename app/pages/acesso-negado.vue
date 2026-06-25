<script setup lang="ts">
definePageMeta({
  layout: false,
})

const supabase = useSupabaseClient()

async function backToLogin() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template lang="pug">
main.denied
  dd-card.denied__card
    dd-stack(spaced)
      span.denied__icon
        icon(name="lucide:shield-alert")
      dd-stack(compact nogap)
        h1.denied__title Acesso negado
        p.denied__copy Seu usuário Google foi autenticado, mas não possui permissão para acessar o Financee. Entre em contato com um administrador.
      dd-button(outline icon="lucide:arrow-left" @click="backToLogin") Voltar ao login
</template>

<style scoped>
.denied {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(220, 38, 38, 0.12), transparent 35%),
    linear-gradient(180deg, #f6f8fc 0%, #e9edf7 100%);
}

.denied__card {
  width: min(100%, 440px);
  padding: 36px;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  text-align: center;
}

.denied__icon {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto;
  border-radius: 16px;
  font-size: 26px;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
}

.denied__title {
  margin: 0;
  font-size: 26px;
  color: #151a30;
}

.denied__copy {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #73768c;
}
</style>
