<script setup lang="ts">
interface DateRangeValue {
  start: string
  end: string
}

const props = defineProps<{
  label: string
  modelValue: DateRangeValue
}>()

const emit = defineEmits<{
  previous: []
  next: []
  confirm: [range: DateRangeValue]
  reset: []
}>()

const draftRange = ref<DateRangeValue>({ ...props.modelValue })

watch(() => props.modelValue, (value) => {
  draftRange.value = { ...value }
}, { deep: true })

function confirmRange() {
  emit('confirm', draftRange.value)
}
</script>

<template lang="pug">
reporting-period-toolbar(
  :label="label"
  @previous="$emit('previous')"
  @next="$emit('next')"
)
  template(#period)
    dd-date-range(
      v-model="draftRange"
      :initial-date="modelValue.start"
      locale="pt-BR"
      :year-range="10"
      @confirm="confirmRange"
      @reset="$emit('reset')"
    )
      dd-button(
        ghost
        small
        type="button"
        aria-label="Selecionar período"
      ) {{ label }}

  template(#start)
    slot(name="start")

  template(#end)
    slot(name="end")
</template>
