<script setup lang="ts">
import type { ConfigCard } from '~/types/backoffice'

defineProps<{
  card: ConfigCard
}>()

</script>

<template lang="pug">
nuxt-link(
  :class="fin.card"
  :to="card.to"
)
  dd-cluster(compact :class="fin.content")
    span(:class="fin.icon")
      icon(:name="card.icon")
    dd-stack(compact :class="fin.text")
      strong(:class="fin.title") {{ card.title }}
      p(:class="fin.description") {{ card.description }}
  icon(:class="fin.chevron" name="lucide:chevron-right")
</template>

<style module="fin">
.card {
  align-items: center;
  background: v('color.bg.surface');
  border: v('border-width.sm') solid;
  border-color: v('color.light-gray');
  border-radius: v('border-radius.lg');
  color: inherit;
  cursor: pointer;
  display: flex;
  gap: v('space.sm');
  inline-size: 100%;
  justify-content: space-between;
  padding: v('space.md') v('space.lg');
  text-decoration: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  &:is(:hover, :focus) {
    border-color: v('color.primary');
    box-shadow: v('shadow.xl');
    /* transform: translateY(-1px); */
    background: v('color.primary.50');
  }
}


.content {
  align-items: flex-start;
  flex-wrap: nowrap;
  min-inline-size: 0;
}

.icon {
  align-items: center;
  background: color-mix(in srgb, v('color.primary') 8%, transparent);
  border-radius: .625rem;
  color: v('color.primary');
  display: inline-flex;
  flex: 0 0 2.5rem;
  block-size: 2.5rem;
  aspect-ratio: 1 / 1;
  justify-content: center;
}

.text {
  --dd-stack-compact-gap: v('space.xxs');
  min-inline-size: 0;
}

.title,
.description {
  margin: 0;
}

.title {
  font-size: v('font-size.md');
  line-height: v('line-height.tight');
}

.description {
  color: v('color.gray');
  line-height: v('line-height.snug');
  font-size: v('font-size.sm');
}

.chevron {
  color: v('color.gray');
  aspect-ratio: 1 / 1;
}
</style>
