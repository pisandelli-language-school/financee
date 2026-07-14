<template lang="pug">
div(:class="fin.card" aria-hidden="true")
  dd-cluster(compact :class="fin.content")
    span(:class="fin.icon")
      dd-skeleton(circle width="1.125rem" height="1.125rem")
    dd-stack(compact :class="fin.text")
      dd-skeleton(height="1rem" width="8rem" radius="999px")
      dd-skeleton(height="0.875rem" width="14rem" radius="999px")
      dd-skeleton(height="0.875rem" width="10.5rem" radius="999px")
  span(:class="fin.chevron")
    dd-skeleton(height="1rem" width="1rem" radius="999px")
</template>

<style module="fin">
.card {
  align-items: center;
  background: v('color.bg.surface');
  border: v('border-width.sm') solid;
  border-color: v('color.light-gray');
  border-radius: v('border-radius.lg');
  display: flex;
  gap: v('space.sm');
  inline-size: 100%;
  justify-content: space-between;
  padding: v('space.md') v('space.lg');
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

.chevron {
  display: inline-flex;
  flex: 0 0 auto;
}
</style>
