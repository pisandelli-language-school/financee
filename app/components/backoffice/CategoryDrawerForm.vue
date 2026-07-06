<script setup lang="ts">
import {
  categoryTypeOptions,
  dreGroupOptions,
  type CategoryFormValues,
  type CategoryRecord,
} from '~/types/backoffice'

const props = defineProps<{
  open: boolean
  modelValue: CategoryFormValues
  categories: CategoryRecord[]
  editingId?: string | null
  errorMessage?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:modelValue', value: CategoryFormValues): void
  (event: 'save'): void
}>()

const parentOptions = computed(() => [
  { label: 'Opcional', value: '' },
  ...(props.categories ?? [])
    .filter((category) => !category.parentId && category.id !== props.editingId)
    .map((category) => ({
      label: `${category.name} (${category.type})`,
      value: category.id,
    })),
])

const typeOptions = computed(() => categoryTypeOptions.map((option) => ({ ...option })))
const groupOptions = computed(() => [
  { label: 'Opcional', value: '' },
  ...dreGroupOptions.map((option) => ({ ...option })),
])

function updateField<K extends keyof CategoryFormValues>(field: K, value: CategoryFormValues[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

function updateType(value: unknown) {
  updateField('type', String(value) as CategoryFormValues['type'])
}

function updateDreGroup(value: unknown) {
  updateField('dreGroup', String(value) as CategoryFormValues['dreGroup'])
}
</script>

<template lang="pug">
dd-drawer(
  :open="open"
  position="right"
  title="Nova categoria"
  @update:open="$emit('update:open', $event)"
)
  dd-stack(compact)
    dd-alert(
      v-if="errorMessage"
      danger
      title="Categoria"
      :closable="false"
      icon
    ) {{ errorMessage }}

    dd-input(
      :model-value="modelValue.name"
      label="Nome da categoria"
      placeholder="Digite o nome da categoria"
      @update:model-value="updateField('name', String($event))"
    )

    dd-select(
      :model-value="modelValue.type"
      label="Tipo"
      :options="typeOptions"
      @update:model-value="updateType"
    )

    dd-select(
      :model-value="modelValue.dreGroup"
      label="Grupo DRE"
      placeholder="Opcional"
      :options="groupOptions"
      @update:model-value="updateDreGroup"
    )

    dd-select(
      :model-value="modelValue.parentId"
      label="Subcategoria de"
      placeholder="Opcional"
      :options="parentOptions"
      @update:model-value="updateField('parentId', String($event))"
    )

  template(#footer)
    dd-cluster(end)
      dd-button(outline @click="$emit('update:open', false)") Cancelar
      dd-button(primary :disabled="loading" icon="lucide:save" @click="$emit('save')")
        | Salvar categoria
</template>
