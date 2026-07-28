<script setup lang="ts">
import logoUrl from '~/assets/images/logo-opt.svg?url'

definePageMeta({
  layout: false,
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

useHead({
  link: [
    {
      rel: 'preload',
      as: 'image',
      href: logoUrl,
      fetchpriority: 'high',
    },
  ],
})

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
main(:class="fin.page")
  //- Brand panel
  section(v-once :class="fin.brand")
    div(:class="fin.brandInner")
      img(:class="fin.logo" :src="logoUrl" alt="Financee" fetchpriority="high")
      div
        h1(:class="fin.headline") Gestão financeira sem ruído.
        p(:class="fin.subhead") O backoffice financeiro da escola — contratos, lançamentos e relatórios em um só lugar.
      ul(:class="fin.highlights")
        li(v-for="item in highlights" :key="item.title" :class="fin.highlight")
          span(:class="fin.highlightIcon")
            icon(:name="item.icon")
          div(:class="fin.highlightText")
            strong {{ item.title }}
            span {{ item.copy }}
    div(:class="fin.brandGlow" aria-hidden="true")

  //- Auth panel
  section(:class="fin.panel")
    dd-card(:class="fin.card")
      dd-stack(spaced)
        dd-stack(compact nogap)
          span(:class="fin.eyebrow") Acesso restrito
          h2(:class="fin.title") Entrar no Financee
          p(:class="fin.hint") Use sua conta Google Workspace da organização.

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

        p(:class="fin.legal") Professores não acessam o Financee. Em caso de erro de acesso, fale com um administrador.
</template>

<style module="fin">
.page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  background: #0a1330;
  color: v('color.text.default');
}

.brand {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: v('space.xl');
  color: v('color.white');
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(56, 102, 255, 0.35), transparent 55%),
    radial-gradient(120% 120% at 100% 100%, rgba(14, 165, 233, 0.28), transparent 50%),
    linear-gradient(160deg, #0a1330 0%, #0f1b46 100%);
}

.brandInner {
  position: relative;
  z-index: 1;
  display: grid;
  gap: v('space.xl');
  max-width: 460px;
}

.logo {
  height: 36px;
  width: auto;
  filter: brightness(0) invert(1);
}

.headline {
  margin: 0;
  font-size: 2.5rem;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: v('color.white');
}

.subhead {
  margin: v('space.sm') 0 0;
  font-size: var(--dd-font-size-base);
  line-height: 1.6;
  color: v('color.gray.200');
}

.highlights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: v('space.md');
}

.highlight {
  display: flex;
  gap: v('space.sm');
  align-items: flex-start;
}

.highlightIcon {
  flex-shrink: 0;
  inline-size: 2.375rem;
  min-block-size: 2.375rem;
  border-radius: v('border-radius.md');
  display: grid;
  place-items: center;
  background: color-mix(in srgb, v('color.primary.200') 16%, transparent);
  border: v('border-width.sm') solid color-mix(in srgb, v('color.info.200') 22%, transparent);
  color: v('color.white');
  font-size: v('font-size.md');
}

.highlightText {
  display: grid;
  gap: v('space.xxs');
}

.highlightText strong {
  color: v('color.white');
  font-size: v('font-size.sm');
  font-weight: v('font-weight.semi-bold');
}

.highlightText span {
  font-size: v('font-size.xs');
  line-height: 1.5;
  color: v('color.gray.300');
}

.brandGlow {
  position: absolute;
  inset: auto -120px -160px auto;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 102, 255, 0.55), transparent 70%);
  filter: blur(40px);
}

.panel {
  display: grid;
  place-items: center;
  padding: v('space.xl');
  background: linear-gradient(180deg, v('color.white') 0%, v('color.light-gray') 100%);
}

.card {
  width: min(100%, 420px);
  --dd-card-body-padding: v('space.xl');
  --dd-card-border-radius: v('border-radius.lg');
  --dd-card-box-shadow: v('shadow.xl');
}

.eyebrow {
  color: v('color.primary');
  font-size: v('font-size.xs');
  font-weight: v('font-weight.semi-bold');
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.title {
  margin: v('space.xxs') 0 0;
  color: v('color.text.default');
  font-size: v('font-size.xl');
  line-height: v('line-height.tight');
}

.hint {
  margin: v('space.xxs') 0 0;
  color: v('color.text.soft');
  font-size: v('font-size.sm');
}

.legal {
  margin: 0;
  color: v('color.gray.500');
  font-size: v('font-size.xs');
  line-height: 1.5;
}

@media (max-width: 860px) {
  .page {
    grid-template-columns: 1fr;
  }

  .brand {
    display: none;
  }
}
</style>
