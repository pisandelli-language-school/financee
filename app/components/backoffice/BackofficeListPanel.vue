<script setup lang="ts">
import type { AppTableColumn } from '~/types/backoffice'

const props = withDefaults(defineProps<{
  columns: AppTableColumn[]
  data: unknown[]
  loading?: boolean
  isInvalid?: boolean
  errorMessage?: string
  page: number
  total: number
  pageSize: number
}>(), {
  loading: false,
  isInvalid: false,
  errorMessage: '',
})

const emit = defineEmits<{
  (event: 'update:page', value: number): void
}>()

const slots = useSlots()

const tableSlotNames = computed(() =>
  Object.keys(slots).filter(name => name !== 'toolbar' && name !== 'notice'),
)
</script>

<template lang="pug">
dd-card
  dd-stack
    slot(name="notice")

    dd-stack(nogap)
      dd-cluster(end :class="fin.toolbar")
        slot(name="toolbar")

      dd-table(
        :columns="props.columns"
        :data="props.data"
        :loading="props.loading"
        :is-invalid="props.isInvalid"
        :error-message="props.errorMessage"
      )
        template(v-for="name in tableSlotNames" :key="name" #[name]="slotProps")
          slot(:name="name" v-bind="slotProps")

      dd-cluster(end :class="fin.pagination")
        dd-pagination(
          compact
          small
          :model-value="props.page"
          :total="props.total"
          :page-size="props.pageSize"
          @update:model-value="emit('update:page', $event)"
        )
</template>

<style module="fin">
.toolbar {
  align-items: flex-start;
  flex-wrap: wrap;
  gap: v('space.sm');
}

/* TODO: Workaround for a Daredash input bug. Remove when fixed. */
.toolbar [class^="_wrapper_"] {
  inline-size: max-content;
}

.pagination {
  margin-block-start: v('space.sm');
}
</style>
