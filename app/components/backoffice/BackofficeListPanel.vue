<script setup lang="ts">
import { backofficePageSizeOptions } from '~/types/backoffice'
import type { AppTableColumn } from '~/types/backoffice'

const props = withDefaults(defineProps<{
  columns: AppTableColumn[]
  data: unknown[]
  loading?: boolean
  isInvalid?: boolean
  errorMessage?: string
  compactTable?: boolean
  page: number
  total: number
  pageSize: number
}>(), {
  loading: false,
  isInvalid: false,
  errorMessage: '',
  compactTable: false,
})

const emit = defineEmits<{
  (event: 'update:page' | 'update:pageSize', value: number): void
}>()

const slots = useSlots()

const tableSlotNames = computed(() =>
  Object.keys(slots).filter(name => !['toolbar', 'notice', 'content', 'empty'].includes(name)),
)

const effectivePageSize = computed(() => (
  props.pageSize > 0 ? props.pageSize : Math.max(props.total, 1)
))

const pageSizeMenuItems = computed(() => backofficePageSizeOptions.map(option => ({
  value: option.value,
  label: option.value === 0 ? 'Todos' : `${option.value} itens`,
  icon: props.pageSize === option.value ? 'lucide:check' : undefined,
})))

const rangeLabel = computed(() => {
  if (props.total === 0) {
    return '0 de 0'
  }

  const start = ((props.page - 1) * effectivePageSize.value) + 1
  const end = props.pageSize === 0
    ? props.total
    : Math.min(props.page * effectivePageSize.value, props.total)

  return `${start}-${end} de ${props.total}`
})

function handlePageSizeSelect(value: number, event?: MouseEvent) {
  emit('update:pageSize', value)

  const popover = event?.currentTarget instanceof HTMLElement
    ? event.currentTarget.closest('[popover]')
    : null

  if (popover instanceof HTMLElement && 'hidePopover' in popover) {
    ;(popover as HTMLElement & { hidePopover: () => void }).hidePopover()
  }
}
</script>

<template lang="pug">
dd-card
  dd-stack
    slot(name="notice")

    dd-stack(nogap)
      dd-cluster(end :class="fin.toolbar")
        slot(name="toolbar")

      template(v-if="$slots.content")
        slot(name="content")

      template(v-else)
        dd-table(
          :columns="props.columns"
          :data="props.data"
          :loading="props.loading"
          :compact="props.compactTable"
          :is-invalid="props.isInvalid"
          :error-message="props.errorMessage"
        )
          template(v-for="name in tableSlotNames" :key="name" #[name]="slotProps")
            slot(:name="name" v-bind="slotProps")

      dd-cluster(between :class="fin.pagination")
        dd-cluster(compact :class="fin.pageSize")
          span(:class="fin.rangeLabel") {{ rangeLabel }}
          dd-popover(trigger="click" placement="top-end")
            dd-button(
              icon="lucide:ellipsis-vertical"
              icon-only
              ghost
              small
              :class="fin.pageSizeButton"
              aria-label="Selecionar quantidade de registros por página"
            )
            template(#content)
              dd-stack(nogap :class="fin.pageSizeMenu")
                p(:class="fin.pageSizeHeading") Mostrar até
                dd-stack(nogap)
                  dd-button(
                    v-for="item in pageSizeMenuItems"
                    :key="item.value"
                    ghost
                    full
                    :icon="item.icon"
                    :class="fin.pageSizeOption"
                    @click="handlePageSizeSelect(item.value, $event)"
                  ) {{ item.label }}
        dd-pagination(
          compact
          small
          :model-value="props.page"
          :total="props.total"
          :page-size="effectivePageSize"
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
  align-items: center;
  flex-wrap: wrap;
  gap: v('space.sm');
  margin-block-start: v('space.sm');
}

.pageSize {
  align-items: center;
  gap: v('space.xs');
}

.rangeLabel {
  color: v('color.text.soft');
  font-size: v('font-size.sm');
}

.pageSizeButton {
  color: v('color.text.soft');
}

.pageSizeMenu {
  min-inline-size: 11rem;
}

.pageSizeHeading {
  border-block-end: 1px solid v('color.border.standard');
  color: v('color.text.soft');
  font-size: v('font-size.sm');
  margin: 0;
  padding-block-end: v('space.xs');
  padding-inline: v('space.xs');
}

.pageSizeOption {
  justify-content: flex-start;
}
</style>
