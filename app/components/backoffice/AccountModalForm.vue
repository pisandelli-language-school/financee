<script setup lang="ts">
import { useForm } from 'vee-validate'
import {
  accountTypeOptions,
  type SimpleCatalogFormValues,
} from '~/types/backoffice'
import { createSimpleCatalogValidationSchema } from '~/validators/simpleCatalog'

const props = defineProps<{
  open: boolean
  title: string
  modelValue: SimpleCatalogFormValues
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:modelValue', value: SimpleCatalogFormValues): void
  (event: 'save'): void
}>()

const typeOptions = computed(() => accountTypeOptions.map((option) => ({ ...option })))

const {
  errors,
  values,
  handleSubmit,
  resetForm,
  setFieldValue,
  submitCount,
  validateField,
} = useForm<SimpleCatalogFormValues>({
  validationSchema: createSimpleCatalogValidationSchema({ requireType: true }),
  initialValues: cloneForm(props.modelValue),
})

watch(
  () => [props.open, props.modelValue] as const,
  ([open]) => {
    if (!open) {
      return
    }

    resetForm({
      values: cloneForm(props.modelValue),
    })
  },
  { deep: true },
)

const submit = handleSubmit((submittedValues) => {
  emit('update:modelValue', cloneForm(submittedValues))
  emit('save')
})

function cloneForm(form: SimpleCatalogFormValues): SimpleCatalogFormValues {
  return {
    ...form,
  }
}

function updateField<K extends keyof SimpleCatalogFormValues>(field: K, value: SimpleCatalogFormValues[K]) {
  setFieldValue(field as never, value as never)
  void validateField(field)
}

function updateInitialValue(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    updateField('initialValue', null)
    return
  }

  const parsed = Number(value)
  updateField('initialValue', Number.isFinite(parsed) ? parsed : null)
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
  :title="title"
  :loading="loading"
  :error-message="errorMessage"
  :class="fin.modal"
  error-title="Conta"
  save-label="Salvar conta"
  @update:open="$emit('update:open', $event)"
  @submit="submit"
)
  dd-card(tag='article' noborder flat)
    dd-stack(compact)
      dd-stack(compact nogap)
        dd-form-label
          | Nome
          span(:class="fin.requiredMark")  *
        dd-form-input(
          name="name"
          placeholder="Digite o nome da conta"
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
            @update:model-value="updateField('type', String($event))"
          )

        dd-input(
          :model-value="values.initialValue ?? ''"
          label="Saldo inicial"
          type="number"
          placeholder="0.00"
          @update:model-value="updateInitialValue"
        )

      dd-checkbox(
        :model-value="values.isActive"
        @update:model-value="updateField('isActive', Boolean($event))"
      ) Registro ativo
</template>

<style module="fin">
.modal {
  --dd-modal-inline-size: min(40rem, calc(100vw - 2rem));
  --dd-modal-max-inline-size: min(40rem, calc(100vw - 2rem));
  max-block-size: 50rem;
}

.requiredMark {
  color: v('color.danger');
}
</style>
