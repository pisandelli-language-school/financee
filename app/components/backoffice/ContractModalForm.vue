<script setup lang="ts">
import { useForm } from 'vee-validate'
import { ContactModule } from '~/api/backoffice'
import {
  contractBillingFrequencyOptions,
  contractBillingModelOptions,
  contractStatusOptions,
  type ContractFormValues,
} from '~/types/contracts'
import { formatCurrencyInput, parseLocalizedNumber, sanitizePercentInput } from '~/utils/number-input'
import { cloneContractForm, contractValidationSchema } from '~/validators/contract'

interface ClientOption {
  label: string
  value: string
}

const props = defineProps<{
  open: boolean
  title: string
  modelValue: ContractFormValues
  renewalReferenceEndDate?: string | null
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'save', value: ContractFormValues): void
}>()

const clientOptions = ref<ClientOption[]>([])
const clientsLoading = ref(false)
const renewalHintVisible = ref(true)

const {
  errors,
  values,
  handleSubmit,
  resetForm,
  setFieldValue,
  submitCount,
  validateField,
} = useForm<ContractFormValues>({
  validationSchema: contractValidationSchema,
  initialValues: cloneContractForm(props.modelValue),
})

const statusOptions = computed(() => contractStatusOptions.map(option => ({ ...option })))
const billingModelOptions = computed(() => contractBillingModelOptions.map(option => ({ ...option })))
const billingFrequencyOptions = computed(() => contractBillingFrequencyOptions.map(option => ({ ...option })))
const isSplitBilling = computed(() => values.billingModel === 'INSTALLMENT' || values.billingModel === 'RECURRING')
const occurrencesLabel = computed(() => values.billingModel === 'INSTALLMENT' ? 'Parcelas' : 'Recorrências')
const renewalHint = computed(() => {
  if (!props.renewalReferenceEndDate) {
    return 'A renovação deve começar depois da vigência do contrato anterior.'
  }

  return `A renovação deve começar depois de ${props.renewalReferenceEndDate}, término previsto do contrato anterior.`
})

watch(
  () => [values.originalAmount, values.discountAmount] as const,
  ([originalAmount, discountAmount]) => {
    syncFinalAmount(originalAmount, discountAmount)
  },
  { immediate: true },
)

watch(
  () => [props.open, props.modelValue] as const,
  async ([open]) => {
    if (!open) {
      return
    }

    renewalHintVisible.value = true

    resetForm({
      values: cloneContractForm(props.modelValue),
    })

    await ensureClientsLoaded()
  },
  { deep: true, immediate: true },
)

const submit = handleSubmit((submittedValues) => {
  emit('save', cloneContractForm(submittedValues))
})

async function ensureClientsLoaded() {
  if (clientOptions.value.length || clientsLoading.value) {
    return
  }

  clientsLoading.value = true

  try {
    const response = await ContactModule.list({
      search: '',
      nature: '',
      role: 'CLIENT',
      page: 1,
      pageSize: 200,
    })

    clientOptions.value = response.items
      .filter(item => item.isActive && item.roles.includes('CLIENT'))
      .map(item => ({
        label: item.name,
        value: item.id,
      }))
  } finally {
    clientsLoading.value = false
  }
}

function updateField<K extends keyof ContractFormValues>(field: K, value: ContractFormValues[K]) {
  setFieldValue(field as never, value as never)
  void validateField(field)
}

function updateStatus(value: unknown) {
  updateField('status', String(value ?? '') as ContractFormValues['status'])
}

function parseAmountValue(value: string) {
  return parseLocalizedNumber(value)
}

function formatAmountValue(value: number) {
  return formatCurrencyInput(value)
}

function syncFinalAmount(originalAmount: string, discountAmount: string) {
  const original = parseAmountValue(originalAmount)

  if (original == null) {
    setFieldValue('finalAmount' as never, '' as never)
    return
  }

  const discountPercent = parseAmountValue(discountAmount) ?? 0
  const finalAmount = original * (1 - (discountPercent / 100))

  setFieldValue('finalAmount' as never, formatAmountValue(finalAmount) as never)
}

function updateOriginalAmount(value: unknown) {
  updateField('originalAmount', formatCurrencyInput(String(value ?? '')))
}

function updateDiscountAmount(value: unknown) {
  updateField('discountAmount', sanitizePercentInput(value))
}

function updateBillingModel(value: unknown) {
  const nextValue = String(value ?? '') as ContractFormValues['billingModel']
  updateField('billingModel', nextValue)

  if (nextValue === 'CASH') {
    updateField('billingFrequency', '')
    updateField('billingOccurrences', '')
    updateField('firstDueDate', '')
    return
  }

  if (!values.billingFrequency) {
    updateField('billingFrequency', 'MONTHLY')
  }

  if (!values.firstDueDate) {
    updateField('firstDueDate', values.startDate)
  }
}

function updateBillingFrequency(value: unknown) {
  updateField('billingFrequency', String(value ?? '') as ContractFormValues['billingFrequency'])
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
  :class="fin.modal"
  :loading="loading"
  :error-message="errorMessage"
  error-title="Contratos"
  save-label="Salvar contrato"
  @update:open="$emit('update:open', $event)"
  @submit="submit"
)
  dd-center(v-if="loading" :class="fin.loadingState")
    dd-loading(label="Carregando informações do contrato...")

  dd-stack(v-else compact)
    dd-alert(v-if="renewalReferenceEndDate" v-model="renewalHintVisible" info)
      dd-stack(compact nogap)
        strong Renovação encadeada
        span {{ renewalHint }}

    dd-grid
      dd-form-input(
        name="title"
        label="Título do contrato"
        required
        placeholder="Digite o título do contrato"
      )
    dd-grid
      dd-select(
        :model-value="values.clientId"
        label="Cliente"
        required
        placeholder="Selecione"
        :options="clientOptions"
        :is-invalid="Boolean(getError('clientId'))"
        :error-message="getError('clientId')"
        :disabled="clientsLoading"
        @update:model-value="updateField('clientId', String($event ?? ''))"
      )

      dd-select(
        :model-value="values.status"
        label="Status"
        required
        placeholder="Selecione"
        :options="statusOptions"
        :is-invalid="Boolean(getError('status'))"
        :error-message="getError('status')"
        @update:model-value="updateStatus"
      )

    dd-grid(:class="fin.amountGrid")
      dd-input-group(label="Valor original *" pre="R$" :error="getError('originalAmount') || undefined")
        dd-input(
          :model-value="values.originalAmount"
          placeholder="0,00"
          @update:model-value="updateOriginalAmount"
        )
      dd-input-group(label="Desconto" post="%" :error="getError('discountAmount') || undefined")
        dd-input(
          :model-value="values.discountAmount"
          placeholder="0"
          @update:model-value="updateDiscountAmount"
        )
      dd-input-group(label="Valor final *" pre="R$" :error="getError('finalAmount') || undefined")
        dd-input(
          :model-value="values.finalAmount"
          placeholder="0,00"
          disabled
        )

    dd-grid
      dd-input(
        :model-value="values.startDate"
        label="Data de início"
        required
        type="date"
        no-message
        :is-invalid="Boolean(getError('startDate'))"
        :error-message="getError('startDate')"
        @update:model-value="updateField('startDate', String($event ?? ''))"
      )
      dd-input(
        :model-value="values.expectedEndDate"
        label="Data prevista de término"
        type="date"
        no-message
        :is-invalid="Boolean(getError('expectedEndDate'))"
        :error-message="getError('expectedEndDate')"
        @update:model-value="updateField('expectedEndDate', String($event ?? ''))"
      )

    dd-grid
      dd-input(
        :model-value="values.totalHours"
        label="Carga horária total"
        placeholder="0"
        no-message
        :is-invalid="Boolean(getError('totalHours'))"
        :error-message="getError('totalHours')"
        @update:model-value="updateField('totalHours', String($event ?? ''))"
      )
      dd-input(
        :model-value="values.weeklyHours"
        label="Carga horária semanal"
        placeholder="0"
        no-message
        :is-invalid="Boolean(getError('weeklyHours'))"
        :error-message="getError('weeklyHours')"
        @update:model-value="updateField('weeklyHours', String($event ?? ''))"
      )

    dd-grid
      dd-select(
        :model-value="values.billingModel"
        label="Cobrança"
        required
        placeholder="Selecione"
        :options="billingModelOptions"
        no-message
        :is-invalid="Boolean(getError('billingModel'))"
        :error-message="getError('billingModel')"
        @update:model-value="updateBillingModel"
      )
      dd-select(
        v-if="isSplitBilling"
        :model-value="values.billingFrequency"
        label="Frequência"
        required
        placeholder="Selecione"
        :options="billingFrequencyOptions"
        no-message
        :is-invalid="Boolean(getError('billingFrequency'))"
        :error-message="getError('billingFrequency')"
        @update:model-value="updateBillingFrequency"
      )
    dd-grid(v-if="isSplitBilling")
      dd-input(
        :model-value="values.billingOccurrences"
        :label="occurrencesLabel"
        required
        type="number"
        placeholder="Ex.: 6"
        no-message
        :is-invalid="Boolean(getError('billingOccurrences'))"
        :error-message="getError('billingOccurrences')"
        @update:model-value="updateField('billingOccurrences', String($event ?? ''))"
      )
      dd-input(
        :model-value="values.firstDueDate"
        label="Primeiro vencimento"
        type="date"
        no-message
        :is-invalid="Boolean(getError('firstDueDate'))"
        :error-message="getError('firstDueDate')"
        @update:model-value="updateField('firstDueDate', String($event ?? ''))"
      )

    dd-textarea(
      :model-value="values.notes"
      label="Observações"
      :rows="4"
      placeholder="Anotações complementares do contrato"
      :is-invalid="Boolean(getError('notes'))"
      :error-message="getError('notes')"
      @update:model-value="updateField('notes', String($event ?? ''))"
    )
</template>

<style module="fin">
.amountGrid {
  --dd-grid-column-min-width: 11rem;
}

.loadingState {
  min-block-size: 20rem;
}

.modal {
  --dd-modal-inline-size: min(56rem, calc(100vw - 2rem));
  --dd-modal-max-inline-size: min(56rem, calc(100vw - 2rem));
}
</style>
