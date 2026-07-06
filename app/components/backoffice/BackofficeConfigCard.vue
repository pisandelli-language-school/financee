<script setup lang="ts">
import type { ConfigCard } from '~/types/backoffice'

defineProps<{
  card: ConfigCard
}>()

defineEmits<{
  (event: 'disabled'): void
}>()
</script>

<template lang="pug">
nuxt-link(
  v-if="card.to"
  class="config-card"
  :to="card.to"
)
  div.config-card__content
    div.config-card__icon
      icon(:name="card.icon")
    dd-stack(compact nogap)
      strong {{ card.title }}
      p {{ card.description }}
  icon.config-card__chevron(name="lucide:chevron-right")

button(
  v-else
  type="button"
  class="config-card config-card--disabled"
  @click="$emit('disabled')"
)
  div.config-card__content
    div.config-card__icon
      icon(:name="card.icon")
    dd-stack(compact nogap)
      strong {{ card.title }}
      p {{ card.description }}
</template>

<style scoped>
.config-card {
  width: 100%;
  border: 1px solid #e3e4e8;
  border-radius: 12px;
  background: #ffffff;
  text-decoration: none;
  color: inherit;
  padding: 20px 22px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.config-card:hover {
  border-color: #0a51cf;
  box-shadow: 0 12px 30px rgba(10, 81, 207, 0.08);
  transform: translateY(-1px);
}

.config-card--disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.config-card__content {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.config-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(10, 81, 207, 0.08);
  color: #0a51cf;
}

.config-card__chevron {
  color: #9da3b5;
}

strong,
p {
  margin: 0;
}

p {
  color: #73768c;
  line-height: 1.45;
}

strong {
  font-size: 18px;
  line-height: 1.25;
}

p {
  margin-top: 6px;
}
</style>
