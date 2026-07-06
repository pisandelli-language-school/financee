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
const fin = useCssModule('fin')

const tableSlotNames = computed(() =>
  Object.keys(slots).filter(name => name !== 'toolbar' && name !== 'notice'),
)
</script>

<template>
  <dd-card>
    <dd-stack compact>
      <slot name="notice" />

      <dd-cluster end :class="fin.toolbar">
        <slot name="toolbar" />
      </dd-cluster>

      <dd-table
        :columns="props.columns"
        :data="props.data"
        :loading="props.loading"
        :is-invalid="props.isInvalid"
        :error-message="props.errorMessage"
      >
        <template
          v-for="name in tableSlotNames"
          :key="name"
          #[name]="slotProps"
        >
          <slot :name="name" v-bind="slotProps" />
        </template>
      </dd-table>

      <dd-cluster end :class="fin.pagination">
        <dd-pagination
          :model-value="props.page"
          :total="props.total"
          :page-size="props.pageSize"
          @update:model-value="emit('update:page', $event)"
        />
      </dd-cluster>
    </dd-stack>
  </dd-card>
</template>

<style module="fin">
.toolbar {
  gap: 12px;
  align-items: start;
  flex-wrap: wrap;
}

/* TODO: Workaround for a Daredash input bug. Remove when fixed. */
.toolbar [class^="_wrapper_"] {
  inline-size: max-content;
}

.pagination {
  margin-top: 12px;
}
</style>
