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
main(:class="fin.page")
  dd-card(:class="fin.card")
    dd-stack(spaced)
      span(:class="fin.icon")
        icon(name="lucide:shield-alert")
      dd-stack(compact nogap)
        h1(:class="fin.title") Acesso negado
        p(:class="fin.copy") Seu usuário Google foi autenticado, mas não possui permissão para acessar o Financee. Entre em contato com um administrador.
      dd-button(outline icon="lucide:arrow-left" @click="backToLogin") Voltar ao login
</template>

<style module="fin">
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: v('space.lg');
  background:
    radial-gradient(circle at top, color-mix(in srgb, v('color.danger') 12%, transparent), transparent 35%),
    linear-gradient(180deg, v('color.bg.surface') 0%, v('color.bg.subtle') 100%);
}

.card {
  width: min(100%, 440px);
  --dd-card-body-padding: v('space.xl');
  --dd-card-border-radius: v('border-radius.lg');
  --dd-card-box-shadow: v('shadow.xl');
  text-align: center;
}

.icon {
  display: inline-grid;
  place-items: center;
  inline-size: 3.5rem;
  min-block-size: 3.5rem;
  margin: 0 auto;
  border-radius: v('border-radius.md');
  background: color-mix(in srgb, v('color.danger') 10%, transparent);
  color: v('color.danger.700');
  font-size: v('font-size.xl');
}

.title {
  margin: 0;
  color: v('color.text.default');
  font-size: v('font-size.xl');
  line-height: v('line-height.tight');
}

.copy {
  margin: v('space.xs') 0 0;
  color: v('color.text.soft');
  font-size: v('font-size.sm');
  line-height: v('line-height.snug');
}
</style>
