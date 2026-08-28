<script setup lang="ts">
defineProps<{
  label: string
}>()

defineEmits<{
  previous: []
  next: []
  select: []
}>()
</script>

<template lang="pug">
div(:class="fin.root")
  div(:class="[fin.zone, fin.start]")
    slot(name="start")

  div(:class="fin.period")
    reporting-period-navigator(
      :label="label"
      @previous="$emit('previous')"
      @next="$emit('next')"
      @select="$emit('select')"
    )
      template(v-if="$slots.period" #period)
        slot(name="period")

  div(:class="[fin.zone, fin.end]")
    slot(name="end")
</template>

<style module="fin">
.root {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: v('space.md');
}

.zone {
  min-inline-size: 0;
}

.start {
  display: flex;
  align-items: center;
  gap: v('space.sm');
}

.period {
  justify-self: center;
}

.end {
  justify-self: end;
}

@media (max-width: 48rem) {
  .root {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .start,
  .end {
    grid-row: 2;
  }

  .period {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .end {
    grid-column: 2;
  }
}
</style>
