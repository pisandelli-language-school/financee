<script setup lang="ts">
import logoUrl from '~/assets/images/logo-opt.svg?url'

definePageMeta({
  layout: false,
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const authError = ref('')
const isSigningIn = ref(false)

const highlights = [
  { icon: 'lucide:wallet', title: 'Núcleo financeiro', copy: 'Lançamentos, recorrências e transferências em um só fluxo.' },
  { icon: 'lucide:file-signature', title: 'Contratos', copy: 'Geração controlada de cobranças e renovação encadeada.' },
  { icon: 'lucide:chart-line', title: 'Relatórios & DRE', copy: 'Fluxo de caixa, inadimplência e visão gerencial.' },
]

watch(user, () => {
  if (user.value) {
    void navigateTo('/configuracoes')
  }
}, { immediate: true })

async function handleGoogleSignIn() {
  authError.value = ''
  isSigningIn.value = true

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/confirm`,
    },
  })

  if (error) {
    authError.value = 'Não foi possível iniciar o login com Google. Tente novamente.'
    isSigningIn.value = false
  }
}
</script>

<template lang="pug">
main.login
  //- Brand panel
  section.login__brand
    .login__brand-inner
      img.login__logo(:src="logoUrl" alt="Financee")
      .login__brand-copy
        h1.login__headline Gestão financeira sem ruído.
        p.login__subhead O backoffice financeiro da escola — contratos, lançamentos e relatórios em um só lugar.
      ul.login__highlights
        li.login__highlight(v-for="item in highlights" :key="item.title")
          span.login__highlight-icon
            icon(:name="item.icon")
          .login__highlight-text
            strong {{ item.title }}
            span {{ item.copy }}
    .login__brand-glow(aria-hidden="true")

  //- Auth panel
  section.login__panel
    dd-card.login__card
      dd-stack(spaced)
        dd-stack(compact nogap)
          span.login__eyebrow Acesso restrito
          h2.login__title Entrar no Financee
          p.login__hint Use sua conta Google Workspace da organização.

        dd-alert(
          v-if="authError"
          danger
          title="Não foi possível entrar"
          :closable="false"
          icon
        ) {{ authError }}

        dd-loading(v-if="user" label="Redirecionando...")

        dd-button(
          v-else
          primary
          icon="lucide:log-in"
          :disabled="isSigningIn"
          @click="handleGoogleSignIn"
        ) {{ isSigningIn ? 'Conectando...' : 'Entrar com Google' }}

        p.login__legal Professores não acessam o Financee. Em caso de erro de acesso, fale com um administrador.
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  background: #0a1330;
  color: #151a30;
}

/* Brand side */
.login__brand {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 56px;
  color: #eef2ff;
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(56, 102, 255, 0.35), transparent 55%),
    radial-gradient(120% 120% at 100% 100%, rgba(14, 165, 233, 0.28), transparent 50%),
    linear-gradient(160deg, #0a1330 0%, #0f1b46 100%);
}

.login__brand-inner {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 40px;
  max-width: 460px;
}

.login__logo {
  height: 36px;
  width: auto;
  filter: brightness(0) invert(1);
}

.login__headline {
  margin: 0;
  font-size: 40px;
  line-height: 1.08;
  letter-spacing: -0.02em;
}

.login__subhead {
  margin: 12px 0 0;
  font-size: 16px;
  line-height: 1.6;
  color: rgba(238, 242, 255, 0.72);
}

.login__highlights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 18px;
}

.login__highlight {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.login__highlight-icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 18px;
  color: #bfdbff;
  background: rgba(99, 102, 241, 0.16);
  border: 1px solid rgba(147, 197, 253, 0.22);
}

.login__highlight-text {
  display: grid;
  gap: 2px;
}

.login__highlight-text strong {
  font-size: 15px;
  font-weight: 600;
}

.login__highlight-text span {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(238, 242, 255, 0.64);
}

.login__brand-glow {
  position: absolute;
  inset: auto -120px -160px auto;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 102, 255, 0.55), transparent 70%);
  filter: blur(40px);
}

/* Auth side */
.login__panel {
  display: grid;
  place-items: center;
  padding: 32px;
  background: linear-gradient(180deg, #f6f8fc 0%, #e9edf7 100%);
}

.login__card {
  width: min(100%, 420px);
  padding: 36px;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.login__eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0a51cf;
}

.login__title {
  margin: 6px 0 0;
  font-size: 26px;
  line-height: 1.1;
  color: #151a30;
}

.login__hint {
  margin: 6px 0 0;
  font-size: 14px;
  color: #73768c;
}

.login__legal {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #9296a8;
}

@media (max-width: 860px) {
  .login {
    grid-template-columns: 1fr;
  }

  .login__brand {
    display: none;
  }
}
</style>
