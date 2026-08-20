<script setup lang="ts">
import logoRaw from '~/assets/images/logo-opt.svg?raw'

const props = withDefaults(defineProps<{
  inverted?: boolean
  blockSize?: string
}>(), {
  inverted: false,
  blockSize: '3rem',
})
</script>

<template lang="pug">
span(
  :class="fin.logo"
  :data-inverted="inverted || undefined"
  :style="{ '--app-logo-block-size': props.blockSize }"
  role="img"
  aria-label="Financee"
  v-html="logoRaw"
)
</template>

<style module="fin">
.logo {
  --app-logo-block-size: 3rem;
  --logo-fill: v('logo.fill');
  aspect-ratio: 529.91 / 156;
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  block-size: var(--app-logo-block-size);
  inline-size: auto;
  overflow: hidden;
}

.logo :deep(svg) {
  display: block;
  block-size: 100%;
  inline-size: 100%;
  flex: 0 0 auto;
}
</style>
