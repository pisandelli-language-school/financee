<script setup lang="ts">
import type { SimpleCatalogFormValues } from '~/types/backoffice'

const props = defineProps<{
  open: boolean
  title: string
  modelValue: SimpleCatalogFormValues
  loading?: boolean
  errorMessage?: string
  showType?: boolean
  showInitialValue?: boolean
  typeLabel?: string
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:modelValue', value: SimpleCatalogFormValues): void
  (event: 'save'): void
}>()

function updateField<K extends keyof SimpleCatalogFormValues>(field: K, value: SimpleCatalogFormValues[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

function updateInitialValue(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    updateField('initialValue', null)
    return
  }

  const parsed = Number(value)
  updateField('initialValue', Number.isFinite(parsed) ? parsed : null)
}
</script>

<template lang="pug">
dd-drawer(
  :open="open"
  position="right"
  :title="title"
  @update:open="$emit('update:open', $event)"
)
  dd-stack(compact)
    dd-alert(
      v-if="errorMessage"
      danger
      title="Cadastro"
      :closable="false"
      icon
    ) {{ errorMessage }}

    dd-input(
      :model-value="modelValue.name"
      label="Nome"
      placeholder="Digite um nome"
      @update:model-value="updateField('name', String($event))"
    )

    dd-input(
      v-if="showType"
      :model-value="modelValue.type"
      :label="typeLabel ?? 'Tipo'"
      placeholder="Ex.: Conta corrente"
      @update:model-value="updateField('type', String($event))"
    )

    dd-input(
      v-if="showInitialValue"
      :model-value="modelValue.initialValue ?? ''"
      label="Saldo inicial"
      type="number"
      placeholder="0.00"
      @update:model-value="updateInitialValue"
    )

    dd-checkbox(
      :model-value="modelValue.isActive"
      @update:model-value="updateField('isActive', Boolean($event))"
    ) Registro ativo

  template(#footer)
    dd-cluster(end)
      dd-button(outline @click="$emit('update:open', false)") Cancelar
      dd-button(primary :disabled="loading" icon="lucide:save" @click="$emit('save')") Salvar
</template>
