<script setup lang="ts">
import { useForm } from 'vee-validate'
import type { AutomationRuleFormValues } from '~/types/notifications'
import { automationRuleValidationSchema, cloneAutomationRuleForm } from '~/validators/automation-rule'

interface RoleOption {
  label: string
  value: string
}

const props = defineProps<{
  open: boolean
  title: string
  description: string
  ruleKey: string
  modelValue: AutomationRuleFormValues
  roleOptions: RoleOption[]
  errorMessage?: string
  loading?: boolean
}>()
const fin = useCssModule('fin')

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:modelValue', value: AutomationRuleFormValues): void
  (event: 'save'): void
}>()

const {
  errors,
  values,
  handleSubmit,
  resetForm,
  setFieldValue,
  submitCount,
} = useForm<AutomationRuleFormValues>({
  validationSchema: automationRuleValidationSchema,
  initialValues: cloneAutomationRuleForm(props.modelValue),
})

watch(
  () => [props.open, props.modelValue] as const,
  ([open]) => {
    if (!open) {
      return
    }

    resetForm({
      values: cloneAutomationRuleForm(props.modelValue),
    })
  },
  { deep: true },
)

const severityOptions = [
  { label: 'Info', value: 'INFO' },
  { label: 'Atenção', value: 'WARNING' },
  { label: 'Crítica', value: 'CRITICAL' },
]

const thresholdLabel = computed(() => {
  if (props.ruleKey === 'contract-ending-soon') {
    return 'Dias antes do término'
  }

  if (props.ruleKey === 'overdue-entry') {
    return 'Dias após o vencimento'
  }

  if (props.ruleKey === 'negative-cash-flow') {
    return 'Threshold mínimo'
  }

  if (props.ruleKey === 'contract-without-generated-entries') {
    return 'Janela de tolerância (dias)'
  }

  return ''
})

const thresholdField = computed(() => {
  if (props.ruleKey === 'contract-ending-soon') {
    return 'daysBeforeEnd'
  }

  if (props.ruleKey === 'overdue-entry') {
    return 'daysAfterDue'
  }

  if (props.ruleKey === 'negative-cash-flow') {
    return 'threshold'
  }

  if (props.ruleKey === 'contract-without-generated-entries') {
    return 'graceDays'
  }

  return ''
})

const thresholdPlaceholder = computed(() => {
  return props.ruleKey === 'negative-cash-flow' ? 'Ex.: 0' : 'Ex.: 15'
})

const thresholdValue = computed(() => {
  const field = thresholdField.value

  if (!field) {
    return ''
  }

  const value = values[field as keyof AutomationRuleFormValues]
  return typeof value === 'number' ? String(value) : ''
})

function updateField<K extends keyof AutomationRuleFormValues>(field: K, value: AutomationRuleFormValues[K]) {
  setFieldValue(field as never, value as never)
}

function updateThreshold(value: string) {
  const field = thresholdField.value as keyof AutomationRuleFormValues | ''

  if (!field) {
    return
  }

  updateField(field, value === '' ? null : Number(value))
}

function updateSeverity(value: string | null | undefined) {
  const nextValue = value === 'CRITICAL' || value === 'WARNING' || value === 'INFO'
    ? value
    : 'INFO'

  updateField('severity', nextValue)
}

function toggleRecipient(role: string, checked: boolean) {
  const next = new Set(values.recipientRoles)

  if (checked) {
    next.add(role)
  } else {
    next.delete(role)
  }

  updateField('recipientRoles', Array.from(next))
}

function getError(path: keyof typeof errors.value | string) {
  if (!submitCount.value) {
    return ''
  }

  return errors.value[path as keyof typeof errors.value] ?? ''
}

const submit = handleSubmit((submittedValues) => {
  emit('update:modelValue', cloneAutomationRuleForm(submittedValues))
  emit('save')
})
</script>

<template lang="pug">
backoffice-modal-form-shell(
  :open="open"
  :title="title"
  :loading="loading"
  :error-message="errorMessage"
  error-title="Automações"
  save-label="Salvar regra"
  @update:open="$emit('update:open', $event)"
  @submit="submit"
)
  dd-stack(compact)
    dd-alert(info icon :closable="false") {{ description }}

    dd-checkbox(
      :model-value="values.isEnabled"
      @update:model-value="updateField('isEnabled', Boolean($event))"
    ) Regra ativa

    dd-select(
      :model-value="values.severity"
      label="Severidade"
      required
      placeholder="Selecione"
      :options="severityOptions"
      :is-invalid="Boolean(getError('severity'))"
      :error-message="getError('severity')"
      @update:model-value="updateSeverity(typeof $event === 'string' ? $event : undefined)"
    )

    dd-input(
      v-if="thresholdField"
      :model-value="thresholdValue"
      :label="thresholdLabel"
      required
      type="number"
      :placeholder="thresholdPlaceholder"
      :is-invalid="Boolean(getError(thresholdField))"
      :error-message="getError(thresholdField)"
      @update:model-value="updateThreshold(String($event ?? ''))"
    )

    dd-stack(compact nogap)
      dd-form-label(required) Destinatários internos
      dd-cluster(compact :class="fin.roles")
        dd-checkbox(
          v-for="role in roleOptions"
          :key="role.value"
          :model-value="values.recipientRoles.includes(role.value)"
          @update:model-value="toggleRecipient(role.value, Boolean($event))"
        ) {{ role.label }}
      span(v-if="getError('recipientRoles')" :class="fin.errorText") {{ getError('recipientRoles') }}
</template>

<style module="fin">
.roles {
  align-items: center;
  flex-wrap: wrap;
  gap: v('space.sm');
}

.errorText {
  color: v('color.danger');
  font-size: v('font-size.sm');
}
</style>
