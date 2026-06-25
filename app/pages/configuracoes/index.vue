<script setup lang="ts">
// TEMPORARY authenticated landing so the login flow is testable end-to-end.
// Replaced by the real Backoffice shell + CRUDs in the 06a implementation step.
import logoUrl from '~/assets/images/logo-opt.svg?url'

definePageMeta({
  layout: false,
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const email = computed(() => (user.value && 'email' in user.value ? user.value.email : '') ?? '')

async function handleSignOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template lang="pug">
main.placeholder
  dd-card.placeholder__card
    dd-stack(spaced)
      img.placeholder__logo(:src="logoUrl" alt="Financee")
      dd-stack(compact nogap)
        h1.placeholder__title Login concluído ✅
        p.placeholder__copy Você está autenticado como #[strong {{ email }}].
        p.placeholder__hint O Backoffice completo (Configurações) será montado na próxima etapa de implementação.
      dd-cluster
        dd-button(outline icon="lucide:log-out" @click="handleSignOut") Sair
</template>

<style scoped>
.placeholder {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(180deg, #f6f8fc 0%, #e9edf7 100%);
}

.placeholder__card {
  width: min(100%, 460px);
  padding: 36px;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.placeholder__logo {
  height: 32px;
  width: auto;
}

.placeholder__title {
  margin: 0;
  font-size: 24px;
  color: #151a30;
}

.placeholder__copy {
  margin: 6px 0 0;
  font-size: 14px;
  color: #4d5670;
}

.placeholder__hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: #73768c;
}
</style>
