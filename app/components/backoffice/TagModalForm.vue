<script setup lang="ts">
import type { TagFormValues } from '~/types/backoffice'

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

const {
  public: {
    daredash: { prefix = 'dd' } = {},
  },
} = useRuntimeConfig()

const paletteFamilies = ['secondary', 'primary', 'info', 'accent', 'warning', 'danger'] as const
const palette = paletteFamilies.map((family) => ({
  family,
  background: cssToken(prefix, family, 300),
  foreground: cssToken(prefix, family, 700),
}))
const defaultBackgroundColor = cssToken(prefix, 'secondary', 200)
const defaultTextColor = cssToken(prefix, 'secondary', 700)

function updateField<K extends keyof TagFormValues>(field: K, value: TagFormValues[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

function selectBackgroundColor(background: string, foreground: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    bgColor: background,
    textColor: foreground,
  })
}

function cssToken(prefix: string, family: string, weight: number) {
  return `var(--${prefix}-color-${family}-${weight})`
}
</script>

<template lang="pug">
backoffice-modal-form-shell(
  :open="open"
  title="Nova tag"
  :loading="loading"
  :error-message="errorMessage"
  error-title="Tag"
  save-label="Salvar tag"
  @update:open="$emit('update:open', $event)"
  @submit="$emit('save')"
)
  dd-input(
    :model-value="modelValue.name"
    label="Nome da tag"
    placeholder="Ex.: urgente"
    @update:model-value="updateField('name', String($event))"
  )

  dd-stack(compact)
    strong(:class="fin.label") Cor
    dd-cluster(:class="fin.colors")
      button(
        v-for="option in palette"
        :key="option.family"
        type="button"
        :class="[fin.swatch, { [fin.swatchActive]: modelValue.bgColor === option.background }]"
        :style="{ backgroundColor: option.background }"
        @click="selectBackgroundColor(option.background, option.foreground)"
      )
      button(
        type="button"
        :class="[fin.swatch, fin.clearSwatch]"
        @click="updateField('bgColor', '')"
      ) Limpar

  dd-stack(compact)
    strong(:class="fin.label") Cor do texto
    dd-cluster(:class="fin.colors")
      button(
        v-for="option in palette"
        :key="option.family"
        type="button"
        :class="[fin.swatch, { [fin.swatchActive]: modelValue.textColor === option.foreground }]"
        :style="{ backgroundColor: option.foreground }"
        @click="updateField('textColor', option.foreground)"
      )
      button(
        type="button"
        :class="[fin.swatch, fin.clearSwatch]"
        @click="updateField('textColor', '')"
      ) Padrão

  dd-stack(compact)
    strong(:class="fin.label") Pré-visualização
    dd-badge(:color="modelValue.bgColor || defaultBackgroundColor")
      span(:style="{ color: modelValue.textColor || defaultTextColor }") {{ modelValue.name || 'Nova tag' }}
</template>

<style module="fin">
.label {
  margin: 0;
  font-size: v('font-size.sm');
}

.colors {
  gap: v('space.sm');
}

.swatch {
  aspect-ratio: 1 / 1;
  block-size: 1.75rem;
  border: v('border-width.sm') solid color-mix(in srgb, v('color.text.default') 8%, transparent);
  border-radius: v('border-radius.full');
  cursor: pointer;
  inline-size: 1.75rem;
  padding: 0;
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}

.swatch:hover {
  transform: translateY(-1px);
}

.swatchActive {
  border-color: v('color.text.default');
  box-shadow: 0 0 0 2px color-mix(in srgb, v('color.primary') 18%, transparent);
}

.clearSwatch {
  aspect-ratio: auto;
  background: v('color.white');
  border-color: v('color.border.default');
  color: v('color.text.muted');
  inline-size: auto;
  padding-inline: v('space.sm');
}
</style>
