<script setup lang="ts">
import { useForm } from 'vee-validate'
import {
  categoryTypeOptions,
  dreGroupOptions,
  type CategoryFormValues,
  type CategoryRecord,
} from '~/types/backoffice'
import { categoryValidationSchema, cloneCategoryForm } from '~/validators/category'

const props = defineProps<{
  open: boolean
  title?: string
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

const {
  errors,
  values,
  handleSubmit,
  resetForm,
  setFieldValue,
  submitCount,
  validateField,
} = useForm<CategoryFormValues>({
  validationSchema: categoryValidationSchema,
  initialValues: cloneCategoryForm(props.modelValue),
})

watch(
  () => [props.open, props.modelValue] as const,
  ([open]) => {
    if (!open) {
      return
    }

    resetForm({
      values: cloneCategoryForm(props.modelValue),
    })
  },
  { deep: true },
)

const submit = handleSubmit((submittedValues) => {
  emit('update:modelValue', cloneCategoryForm(submittedValues))
  emit('save')
})

function updateField<K extends keyof CategoryFormValues>(field: K, value: CategoryFormValues[K]) {
  setFieldValue(field as never, value as never)
  void validateField(field)
}

function updateType(value: unknown) {
  updateField('type', String(value) as CategoryFormValues['type'])
}

function updateDreGroup(value: unknown) {
  updateField('dreGroup', String(value) as CategoryFormValues['dreGroup'])
}

function getError(path: keyof typeof errors.value | string) {
  if (!submitCount.value) {
    return ''
  }

  return errors.value[path as keyof typeof errors.value] ?? ''
}
</script>

<template lang="pug">
backoffice-modal-form-shell(
  :open="open"
  :title="title ?? 'Nova categoria'"
  :loading="loading"
  :error-message="errorMessage"
  :class="fin.modal"
  error-title="Categoria"
  save-label="Salvar categoria"
  @update:open="$emit('update:open', $event)"
  @submit="submit"
)
  dd-card(tag='article' noborder flat :class='fin.card')
    dd-stack(compact)
      dd-stack(compact nogap)
        dd-form-label
          | Nome da categoria
          span(:class="fin.requiredMark")  *
        dd-form-input(
          name="name"
          placeholder="Digite o nome da categoria"
        )

      dd-grid
        dd-stack(compact nogap)
          dd-form-label
            | Tipo
            span(:class="fin.requiredMark")  *
          dd-select(
            :model-value="values.type"
            placeholder="Selecione"
            :options="typeOptions"
            :is-invalid="Boolean(getError('type'))"
            :error-message="getError('type')"
            @update:model-value="updateType"
          )
        dd-select(
          :model-value="values.parentId"
          label="Subcategoria de"
          placeholder="Opcional"
          :options="parentOptions"
          @update:model-value="updateField('parentId', String($event))"
        )

      dd-select(
        :model-value="values.dreGroup"
        label="Grupo DRE"
        placeholder="Opcional"
        :options="groupOptions"
        @update:model-value="updateDreGroup"
      )
</template>

<style module="fin">
.modal {
  --dd-modal-inline-size: min(42rem, calc(100vw - 2rem));
  --dd-modal-max-inline-size: min(42rem, calc(100vw - 2rem));
  --dd-card-body-padding: .3125rem;
  max-block-size: 50rem;
}

.requiredMark {
  color: v('color.danger');
}
</style>
