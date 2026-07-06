<script setup lang="ts">
import type { TagFormValues } from '~/types/backoffice'

const colorPalette = [
  '#DCEAFE',
  '#E0F2FE',
  '#DCFCE7',
  '#FEF3C7',
  '#FCE7F3',
  '#F3E8FF',
  '#F1F5F9',
] as const

const textPalette = [
  '#0A51CF',
  '#0369A1',
  '#166534',
  '#92400E',
  '#BE185D',
  '#6D28D9',
  '#151A30',
] as const

const props = defineProps<{
  open: boolean
  modelValue: TagFormValues
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:modelValue', value: TagFormValues): void
  (event: 'save'): void
}>()

function updateField<K extends keyof TagFormValues>(field: K, value: TagFormValues[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}
</script>

<template lang="pug">
dd-modal(
  :open="open"
  title="Nova tag"
  @update:open="$emit('update:open', $event)"
)
  dd-stack(compact)
    dd-alert(
      v-if="errorMessage"
      danger
      title="Tag"
      :closable="false"
      icon
    ) {{ errorMessage }}

    dd-input(
      :model-value="modelValue.name"
      label="Nome da tag"
      placeholder="Ex.: urgente"
      @update:model-value="updateField('name', String($event))"
    )

    dd-stack(compact)
      strong.modal-label Cor
      dd-cluster.compact-colors
        button.color-swatch(
          v-for="color in colorPalette"
          :key="color"
          type="button"
          :class="{ 'color-swatch--active': modelValue.bgColor === color }"
          :style="{ backgroundColor: color }"
          @click="updateField('bgColor', color)"
        )
        button.color-swatch.color-swatch--clear(
          type="button"
          @click="updateField('bgColor', '')"
        ) Limpar

    dd-stack(compact)
      strong.modal-label Cor do texto
      dd-cluster.compact-colors
        button.color-swatch(
          v-for="color in textPalette"
          :key="color"
          type="button"
          :class="{ 'color-swatch--active': modelValue.textColor === color }"
          :style="{ backgroundColor: color }"
          @click="updateField('textColor', color)"
        )
        button.color-swatch.color-swatch--clear(
          type="button"
          @click="updateField('textColor', '')"
        ) Padrão

    dd-stack(compact)
      strong.modal-label Pré-visualização
      dd-badge(:color="modelValue.bgColor || '#F1F5F9'")
        span(:style="{ color: modelValue.textColor || '#151A30' }") {{ modelValue.name || 'Nova tag' }}

  template(#footer)
    dd-cluster(end)
      dd-button(outline @click="$emit('update:open', false)") Cancelar
      dd-button(primary :disabled="loading" icon="lucide:save" @click="$emit('save')") Salvar tag
</template>

<style scoped>
.modal-label {
  margin: 0;
  font-size: 13px;
}

.compact-colors {
  gap: 8px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}

.color-swatch--active {
  border-color: #151a30;
}

.color-swatch--clear {
  width: auto;
  height: 24px;
  padding: 0 10px;
  border-color: #e3e4e8;
  background: #ffffff;
  color: #73768c;
}
</style>
