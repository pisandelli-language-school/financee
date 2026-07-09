<script setup lang="ts">
import {
  nonBusinessDayRuleOptions,
  nonBusinessDayScopeOptions,
  nonBusinessDayTypeOptions,
  type NonBusinessDayFormValues,
} from '~/types/backoffice'

const props = defineProps<{
  open: boolean
  title?: string
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
const scopeOptions = computed(() => nonBusinessDayScopeOptions.map((option) => ({ ...option })))

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
backoffice-modal-form-shell(
  :open="open"
  :title="title ?? 'Novo dia não útil'"
  :loading="loading"
  :error-message="errorMessage"
  :class="fin.modal"
  error-title="Dia não útil"
  save-label="Salvar"
  @update:open="$emit('update:open', $event)"
  @submit="$emit('save')"
)
  dd-card(tag='article' noborder flat)
    dd-stack(compact)
      dd-input(
        :model-value="modelValue.title"
        label="Título"
        placeholder="Ex.: Natal"
        @update:model-value="updateField('title', String($event))"
      )
      dd-grid
        dd-select(
          :model-value="modelValue.type"
          label="Tipo"
          :options="typeOptions"
          @update:model-value="updateType"
        )
        dd-stack(compact nogap)
          dd-form-label Escopo
          dd-cluster(compact)
            dd-select(
              :class="fin.selectField"
              :model-value="modelValue.scope"
              placeholder="Selecione"
              :options="scopeOptions"
              @update:model-value="updateScope"
            )
            dd-button(
              v-if="modelValue.scope"
              outline
              tiny
              type="button"
              @click="updateScope('')"
            ) Limpar

      dd-grid(v-if="isFixed")
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

      dd-textarea(
        :model-value="modelValue.notes"
        label="Observações"
        :rows="4"
        placeholder="Detalhes adicionais sobre o calendário."
        @update:model-value="updateField('notes', String($event))"
      )

      dd-checkbox(
        :model-value="modelValue.isActive"
        @update:model-value="updateField('isActive', Boolean($event))"
      ) Registro ativo
</template>

<style module="fin">
.modal {
  --dd-modal-inline-size: min(42rem, calc(100vw - 2rem));
  --dd-modal-max-inline-size: min(42rem, calc(100vw - 2rem));
  max-block-size: 50rem;
}

.selectField {
  flex: 1 1 auto;
}

</style>
