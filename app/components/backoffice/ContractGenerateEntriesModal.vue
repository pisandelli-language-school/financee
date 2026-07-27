<script setup lang="ts">
import { useForm } from 'vee-validate'
import {
  AccountModule,
  CategoryModule,
  CostCenterModule,
  PaymentMethodModule,
} from '~/api/backoffice'
import type {
  AccountRecord,
  CategoryRecord,
  CostCenterRecord,
  PaymentMethodRecord,
} from '~/types/backoffice'
import {
  contractBillingFrequencyOptions,
  contractBillingModelOptions,
  type ContractGenerationFormValues,
  type ContractGenerationPreviewItem,
  type ContractRecord,
} from '~/types/contracts'
import {
  cloneContractGenerationForm,
  createContractGenerationForm,
  contractGenerationValidationSchema,
} from '~/validators/contract-generation'

const props = defineProps<{
  open: boolean
  contract: ContractRecord | null
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'generate', value: ContractGenerationFormValues): void
}>()

const accountRecords = ref<AccountRecord[]>([])
const categoryRecords = ref<CategoryRecord[]>([])
const costCenterRecords = ref<CostCenterRecord[]>([])
const paymentMethodRecords = ref<PaymentMethodRecord[]>([])
const optionsLoading = ref(false)

const {
  errors,
  values,
  handleSubmit,
  resetForm,
  setFieldValue,
  submitCount,
  validateField,
} = useForm<ContractGenerationFormValues>({
  validationSchema: contractGenerationValidationSchema,
  initialValues: props.contract ? createContractGenerationForm(props.contract) : {
    description: '',
    accountId: '',
    paymentMethodId: '',
    categoryId: '',
    subcategoryId: '',
    costCenterId: '',
    firstDueDate: '',
    notes: '',
  },
})

const billingModelMap = new Map(contractBillingModelOptions.map(option => [option.value, option.label]))
const billingFrequencyMap = new Map(contractBillingFrequencyOptions.map(option => [option.value, option.label]))

const categoryOptions = computed(() => categoryRecords.value
  .filter(category => !category.parentId && category.type === 'INCOME')
  .map(category => ({
    label: category.name,
    value: category.id,
  })))

const subcategoryOptions = computed(() => categoryRecords.value
  .filter(category => category.parentId === values.categoryId && category.type === 'INCOME')
  .map(category => ({
    label: category.name,
    value: category.id,
  })))

const accountOptions = computed(() => accountRecords.value.map(account => ({
  label: account.name,
  value: account.id,
})))

const costCenterOptions = computed(() => costCenterRecords.value.map(center => ({
  label: center.name,
  value: center.id,
})))

const paymentMethodOptions = computed(() => paymentMethodRecords.value.map(method => ({
  label: method.name,
  value: method.id,
})))

const billingSummary = computed(() => {
  if (!props.contract) {
    return '-'
  }

  const model = billingModelMap.get(props.contract.billingModel) ?? props.contract.billingModel

  if (props.contract.billingModel === 'CASH') {
    return model
  }

  const frequency = props.contract.billingFrequency
    ? (billingFrequencyMap.get(props.contract.billingFrequency) ?? props.contract.billingFrequency)
    : '-'
  const occurrences = props.contract.billingOccurrences ?? '-'

  return `${model} · ${frequency} · ${occurrences}`
})

const previewItems = computed<ContractGenerationPreviewItem[]>(() => {
  const contract = props.contract

  if (!contract || !values.firstDueDate) {
    return []
  }

  const count = contract.billingModel === 'CASH'
    ? 1
    : contract.billingOccurrences ?? 0

  if (!count) {
    return []
  }

  const firstDate = new Date(`${values.firstDueDate}T00:00:00.000Z`)

  if (Number.isNaN(firstDate.valueOf())) {
    return []
  }

  if (contract.billingModel === 'INSTALLMENT') {
    const installments = splitInstallments(contract.finalAmount, count)

    return installments.map((amount, index) => ({
      index: index + 1,
      amount,
      scheduledDueDate: toDateOnly(addBillingOffset(firstDate, contract.billingFrequency ?? 'MONTHLY', index)),
    }))
  }

  const amount = contract.finalAmount

  return Array.from({ length: count }, (_, index) => ({
    index: index + 1,
    amount,
    scheduledDueDate: toDateOnly(addBillingOffset(firstDate, contract.billingFrequency ?? 'MONTHLY', index)),
  }))
})

watch(() => props.open, async (open) => {
  if (!open || !props.contract) {
    return
  }

  resetForm({
    values: createContractGenerationForm(props.contract),
  })

  await loadOptions()
})

watch(() => values.categoryId, () => {
  const hasValidSubcategory = categoryRecords.value.some(category =>
    category.id === values.subcategoryId && category.parentId === values.categoryId,
  )

  if (!hasValidSubcategory) {
    setFieldValue('subcategoryId', '')
  }
})

const submit = handleSubmit((submittedValues) => {
  emit('generate', cloneContractGenerationForm(submittedValues))
})

async function loadOptions() {
  optionsLoading.value = true

  try {
    const [accounts, categories, costCenters, paymentMethods] = await Promise.all([
      AccountModule.list({ search: '', page: 1, pageSize: 200 }),
      CategoryModule.list({ search: '', type: 'INCOME', page: 1, pageSize: 200 }),
      CostCenterModule.list({ search: '', page: 1, pageSize: 200 }),
      PaymentMethodModule.list({ search: '', page: 1, pageSize: 200 }),
    ])

    accountRecords.value = accounts.items.filter(account => account.isActive)
    categoryRecords.value = categories.items.filter(category => category.isActive)
    costCenterRecords.value = costCenters.items.filter(center => center.isActive)
    paymentMethodRecords.value = paymentMethods.items.filter(method => method.isActive)
  } finally {
    optionsLoading.value = false
  }
}

function updateField<K extends keyof ContractGenerationFormValues>(field: K, value: ContractGenerationFormValues[K]) {
  setFieldValue(field as never, value as never)
  void validateField(field)
}

function getError(path: keyof typeof errors.value | string) {
  if (!submitCount.value) {
    return ''
  }

  return errors.value[path as keyof typeof errors.value] ?? ''
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

function addMonths(date: Date, monthOffset: number) {
  const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + monthOffset
  const year = Math.floor(totalMonths / 12)
  const month = ((totalMonths % 12) + 12) % 12
  const day = date.getUTCDate()
  const targetDay = Math.min(day, new Date(Date.UTC(year, month + 1, 0)).getUTCDate())

  return new Date(Date.UTC(year, month, targetDay))
}

function addBillingOffset(date: Date, frequency: NonNullable<ContractRecord['billingFrequency']>, index: number) {
  if (index === 0) {
    return date
  }

  if (frequency === 'QUARTERLY') {
    return addMonths(date, index * 3)
  }

  if (frequency === 'SEMIANNUAL') {
    return addMonths(date, index * 6)
  }

  if (frequency === 'ANNUAL') {
    return addMonths(date, index * 12)
  }

  return addMonths(date, index)
}

function splitInstallments(total: number, count: number) {
  const totalInCents = Math.round(total * 100)
  const base = Math.floor(totalInCents / count)
  const remainder = totalInCents - (base * count)

  return Array.from({ length: count }, (_, index) => (base + (index === count - 1 ? remainder : 0)) / 100)
}
</script>

<template lang="pug">
backoffice-modal-form-shell(
  :open="open"
  title="Gerar lançamentos"
  :loading="loading"
  :error-message="errorMessage"
  error-title="Contratos"
  save-label="Gerar lançamentos"
  save-icon="lucide:sparkles"
  :class="fin.modal"
  @update:open="$emit('update:open', $event)"
  @submit="submit"
)
  dd-stack(compact)
    dd-card(v-if="contract" flat)
      dd-stack(compact)
        dd-cluster(between)
          dd-stack(compact nogap)
            strong {{ contract.title }}
            span(:class="fin.subcopy") {{ contract.clientName }}
          dd-badge(info) {{ billingSummary }}
        dd-grid
          dd-stack(compact nogap)
            span(:class="fin.label") Valor base
            strong {{ formatCurrency(contract.finalAmount) }}
          dd-stack(compact nogap)
            span(:class="fin.label") Primeiro vencimento padrão
            span {{ contract.firstDueDate ?? contract.startDate }}

    dd-grid
      dd-form-input(
        name="description"
        label="Descrição base"
        required
        placeholder="Ex.: Mensalidade contrato VIP"
      )
      dd-input(
        :model-value="values.firstDueDate"
        label="Primeiro vencimento"
        required
        type="date"
        no-message
        :is-invalid="Boolean(getError('firstDueDate'))"
        :error-message="getError('firstDueDate')"
        @update:model-value="updateField('firstDueDate', String($event ?? ''))"
      )

    dd-grid
      dd-select(
        :model-value="values.accountId"
        label="Conta"
        required
        placeholder="Selecione"
        :options="accountOptions"
        :disabled="optionsLoading"
        no-message
        :is-invalid="Boolean(getError('accountId'))"
        :error-message="getError('accountId')"
        @update:model-value="updateField('accountId', String($event ?? ''))"
      )
      dd-select(
        :model-value="values.paymentMethodId"
        label="Forma de pagamento"
        placeholder="Selecione"
        :options="paymentMethodOptions"
        :disabled="optionsLoading"
        no-message
        :is-invalid="Boolean(getError('paymentMethodId'))"
        :error-message="getError('paymentMethodId')"
        @update:model-value="updateField('paymentMethodId', String($event ?? ''))"
      )

    dd-grid
      dd-select(
        :model-value="values.categoryId"
        label="Categoria"
        required
        placeholder="Selecione"
        :options="categoryOptions"
        :disabled="optionsLoading"
        no-message
        :is-invalid="Boolean(getError('categoryId'))"
        :error-message="getError('categoryId')"
        @update:model-value="updateField('categoryId', String($event ?? ''))"
      )
      dd-select(
        :model-value="values.subcategoryId"
        label="Subcategoria"
        placeholder="Selecione"
        :options="subcategoryOptions"
        :disabled="optionsLoading || !values.categoryId"
        no-message
        :is-invalid="Boolean(getError('subcategoryId'))"
        :error-message="getError('subcategoryId')"
        @update:model-value="updateField('subcategoryId', String($event ?? ''))"
      )

    dd-grid
      dd-select(
        :model-value="values.costCenterId"
        label="Centro de custo"
        placeholder="Selecione"
        :options="costCenterOptions"
        :disabled="optionsLoading"
        no-message
        :is-invalid="Boolean(getError('costCenterId'))"
        :error-message="getError('costCenterId')"
        @update:model-value="updateField('costCenterId', String($event ?? ''))"
      )

    dd-textarea(
      :model-value="values.notes"
      label="Observações"
      :rows="3"
      placeholder="Observações que devem acompanhar os lançamentos"
      :is-invalid="Boolean(getError('notes'))"
      :error-message="getError('notes')"
      @update:model-value="updateField('notes', String($event ?? ''))"
    )

    dd-stack(compact)
      dd-cluster(between)
        strong Pré-visualização
        span(:class="fin.subcopy") {{ previewItems.length }} lançamento(s)
      dd-card(flat)
        dd-stack(compact)
          dd-cluster(
            v-for="item in previewItems"
            :key="`${item.index}-${item.scheduledDueDate}`"
            between
            compact
          )
            dd-cluster(compact :class="fin.previewIndex")
              span {{ item.index }}.
              span {{ item.scheduledDueDate }}
            strong {{ formatCurrency(item.amount) }}
</template>

<style module="fin">
.modal {
  --dd-modal-inline-size: min(48rem, calc(100vw - 2rem));
  --dd-modal-max-inline-size: min(48rem, calc(100vw - 2rem));
}

.subcopy,
.label {
  color: v('color.text.soft');
  font-size: v('font-size.sm');
}

.previewIndex {
  font-variant-numeric: tabular-nums;
}
</style>
