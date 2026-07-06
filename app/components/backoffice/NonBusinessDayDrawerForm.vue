<script setup lang="ts">
import {
  nonBusinessDayRuleOptions,
  nonBusinessDayScopeOptions,
  nonBusinessDayTypeOptions,
  type NonBusinessDayFormValues,
} from '~/types/backoffice'

const props = defineProps<{
  open: boolean
  modelValue: NonBusinessDayFormValues
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:modelValue', value: NonBusinessDayFormValues): void
  (event: 'save'): void
}>()

const isFixed = computed(() => props.modelValue.type === 'FIXED')
const isCalculated = computed(() => props.modelValue.type === 'CALCULATED')
const isCustom = computed(() => props.modelValue.type === 'CUSTOM')
const typeOptions = computed(() => nonBusinessDayTypeOptions.map((option) => ({ ...option })))
const ruleOptions = computed(() => [
  { label: 'Selecione', value: '' },
  ...nonBusinessDayRuleOptions.map((option) => ({ ...option })),
])
const scopeOptions = computed(() => [
  { label: 'Opcional', value: '' },
  ...nonBusinessDayScopeOptions.map((option) => ({ ...option })),
])

function updateField<K extends keyof NonBusinessDayFormValues>(field: K, value: NonBusinessDayFormValues[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

function updateType(value: unknown) {
  updateField('type', String(value) as NonBusinessDayFormValues['type'])
}

function updateRule(value: unknown) {
  updateField('rule', String(value) as NonBusinessDayFormValues['rule'])
}

function updateScope(value: unknown) {
  updateField('scope', String(value) as NonBusinessDayFormValues['scope'])
}
</script>

<template lang="pug">
dd-drawer(
  :open="open"
  position="right"
  title="Novo dia não útil"
  @update:open="$emit('update:open', $event)"
)
  dd-stack(compact)
    dd-alert(
      v-if="errorMessage"
      danger
      title="Dia não útil"
      :closable="false"
      icon
    ) {{ errorMessage }}

    dd-input(
      :model-value="modelValue.title"
      label="Título"
      placeholder="Ex.: Natal"
      @update:model-value="updateField('title', String($event))"
    )

    dd-select(
      :model-value="modelValue.type"
      label="Tipo"
      :options="typeOptions"
      @update:model-value="updateType"
    )

    dd-cluster(v-if="isFixed")
      dd-input(
        :model-value="modelValue.day ?? ''"
        label="Dia"
        type="number"
        @update:model-value="updateField('day', Number($event))"
      )
      dd-input(
        :model-value="modelValue.month ?? ''"
        label="Mês"
        type="number"
        @update:model-value="updateField('month', Number($event))"
      )

    dd-select(
      v-if="isCalculated"
      :model-value="modelValue.rule"
      label="Regra"
      :options="ruleOptions"
      @update:model-value="updateRule"
    )

    dd-input(
      v-if="isCustom"
      :model-value="modelValue.date"
      label="Data"
      type="date"
      @update:model-value="updateField('date', String($event))"
    )

    dd-select(
      :model-value="modelValue.scope"
      label="Escopo"
      placeholder="Opcional"
      :options="scopeOptions"
      @update:model-value="updateScope"
    )

    dd-textarea(
      :model-value="modelValue.notes"
      label="Observações"
      :rows="4"
      placeholder="Detalhes adicionais sobre o calendário."
      @update:model-value="updateField('notes', String($event))"
    )

  template(#footer)
    dd-cluster(end)
      dd-button(outline @click="$emit('update:open', false)") Cancelar
      dd-button(primary :disabled="loading" icon="lucide:save" @click="$emit('save')") Salvar
</template>
