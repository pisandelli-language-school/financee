<script setup lang="ts">
import { useForm } from 'vee-validate'
import type { SimpleCatalogFormValues } from '~/types/backoffice'
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


const {
  values,
  handleSubmit,
  resetForm,
  setFieldValue,
  validateField,
} = useForm<SimpleCatalogFormValues>({
  validationSchema: createSimpleCatalogValidationSchema(),
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
</script>

<template lang="pug">
backoffice-modal-form-shell(
  :open="open"
  :title="title"
  :loading="loading"
  :error-message="errorMessage"
  :class="fin.modal"
  error-title="Cadastro"
  save-label="Salvar"
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
          placeholder="Digite um nome"
        )

      dd-checkbox(
        :model-value="values.isActive"
        @update:model-value="updateField('isActive', Boolean($event))"
      ) Registro ativo
</template>

<style module="fin">
.modal {
  --dd-modal-inline-size: min(38rem, calc(100vw - 2rem));
  --dd-modal-max-inline-size: min(38rem, calc(100vw - 2rem));
  max-block-size: 50rem;
}

.requiredMark {
  color: v('color.danger');
}
</style>
