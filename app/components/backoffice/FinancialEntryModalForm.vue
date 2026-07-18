<script setup lang="ts">
import { useForm } from 'vee-validate'
import {
  AccountModule,
  CategoryModule,
  ContactModule,
  CostCenterModule,
  TagModule,
} from '~/api/backoffice'
import { FinancialEntriesModule } from '~/api/financial'
import type {
  AccountRecord,
  CategoryRecord,
  ContactRecord,
  CostCenterRecord,
  TagRecord,
} from '~/types/backoffice'
import {
  entryDirectionOptions,
  entryTypeOptions,
  type FinancialEntryFormValues,
  type FinancialEntryRecord,
  recurrenceFrequencyOptions,
  recurrenceTypeOptions,
} from '~/types/financial'
import {
  cloneFinancialEntryForm,
  createFinancialEntryForm,
  createFinancialEntryFormFromRecord,
  financialEntryValidationSchema,
} from '~/validators/financial-entry'

const props = defineProps<{
  open: boolean
  entry?: FinancialEntryRecord | null
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'saved', value: FinancialEntryRecord): void
}>()

const { showToast } = useToaster()
const { getErrorMessage } = useBackofficeApiFeedback()

const accountRecords = ref<AccountRecord[]>([])
const categoryRecords = ref<CategoryRecord[]>([])
const costCenterRecords = ref<CostCenterRecord[]>([])
const contactRecords = ref<ContactRecord[]>([])
const tagRecords = ref<TagRecord[]>([])
const loading = ref(false)
const optionsLoading = ref(false)
const errorMessage = ref('')

const isEditing = computed(() => Boolean(props.entry))
const modalTitle = computed(() => isEditing.value ? 'Editar lançamento' : 'Novo lançamento')
const saveLabel = computed(() => isEditing.value ? 'Salvar alterações' : 'Salvar lançamento')
const isTransfer = computed(() => values.type === 'TRANSFER')
const isRecurring = computed(() => values.recurrenceType !== 'ONE_TIME')
const directionOptions = computed(() => entryDirectionOptions.map(option => ({ ...option })))
const typeOptions = computed(() => {
  const options = isEditing.value
    ? entryTypeOptions.filter(option => option.value !== 'TRANSFER')
    : entryTypeOptions

  return options.map(option => ({ ...option }))
})
const recurrenceOptions = computed(() => recurrenceTypeOptions.map(option => ({ ...option })))
const frequencyOptions = computed(() => recurrenceFrequencyOptions.map(option => ({ ...option })))
const accountOptions = computed(() => accountRecords.value.map(account => ({
  label: account.name,
  value: account.id,
})))
const costCenterOptions = computed(() => costCenterRecords.value.map(center => ({
  label: center.name,
  value: center.id,
})))

const {
  errors,
  values,
  handleSubmit,
  resetForm,
  setFieldValue,
  submitCount,
  validateField,
} = useForm<FinancialEntryFormValues>({
  validationSchema: financialEntryValidationSchema,
  initialValues: createFinancialEntryForm(),
})

const categoryOptions = computed(() => categoryRecords.value
  .filter(category => !category.parentId && category.type === values.direction)
  .map(category => ({
    label: category.name,
    value: category.id,
  })))

const subcategoryOptions = computed(() => categoryRecords.value
  .filter(category => category.parentId === values.categoryId && category.type === values.direction)
  .map(category => ({
    label: category.name,
    value: category.id,
  })))

const contactOptions = computed(() => {
  const requiredRole = values.direction === 'INCOME'
    ? 'CLIENT'
    : values.direction === 'EXPENSE'
      ? 'SUPPLIER'
      : null

  return contactRecords.value
    .filter(contact => !requiredRole || contact.roles.includes(requiredRole))
    .map(contact => ({
      label: contact.name,
      value: contact.id,
    }))
})

const tagOptions = computed(() => tagRecords.value.map(tag => ({
  label: tag.name,
  value: tag.id,
})))

watch(() => props.open, async (open) => {
  if (!open) {
    return
  }

  resetForm({
    values: props.entry
      ? createFinancialEntryFormFromRecord(props.entry)
      : createFinancialEntryForm(),
  })
  errorMessage.value = ''
  await loadOptions()
})

watch(() => values.direction, () => {
  const hasValidCategory = categoryRecords.value.some(category => category.id === values.categoryId && category.type === values.direction)

  if (!hasValidCategory) {
    setFieldValue('categoryId', '')
    setFieldValue('subcategoryId', '')
  }

  const hasValidContact = contactRecords.value.some(contact => contact.id === values.contactId && (
    values.direction === 'INCOME'
      ? contact.roles.includes('CLIENT')
      : contact.roles.includes('SUPPLIER')
  ))

  if (!hasValidContact) {
    setFieldValue('contactId', '')
  }
})

watch(() => values.categoryId, () => {
  const hasValidSubcategory = categoryRecords.value.some(category => category.id === values.subcategoryId && category.parentId === values.categoryId)

  if (!hasValidSubcategory) {
    setFieldValue('subcategoryId', '')
  }
})

const submit = handleSubmit(async (submittedValues) => {
  loading.value = true
  errorMessage.value = ''

  try {
    const payload = cloneFinancialEntryForm(submittedValues)
    const record = props.entry
      ? await FinancialEntriesModule.update(props.entry.id, payload)
      : await FinancialEntriesModule.create(payload)

    showToast(props.entry ? 'Lançamento atualizado com sucesso.' : 'Lançamento criado com sucesso.', {
      title: 'Lançamentos',
      type: 'success',
    })
    emit('saved', record)
    emit('update:open', false)
  } catch (error) {
    errorMessage.value = getErrorMessage(
      error,
      props.entry ? 'Não foi possível atualizar o lançamento.' : 'Não foi possível criar o lançamento.',
    )
  } finally {
    loading.value = false
  }
})

async function loadOptions() {
  optionsLoading.value = true

  try {
    const [accounts, categories, costCenters, contacts, tags] = await Promise.all([
      AccountModule.list({ search: '', page: 1, pageSize: 200 }),
      CategoryModule.list({ search: '', type: '', page: 1, pageSize: 200 }),
      CostCenterModule.list({ search: '', page: 1, pageSize: 200 }),
      ContactModule.list({ search: '', nature: '', role: '', page: 1, pageSize: 200 }),
      TagModule.list({ search: '', page: 1, pageSize: 200 }),
    ])

    accountRecords.value = accounts.items.filter(item => item.isActive)
    categoryRecords.value = categories.items.filter(item => item.isActive)
    costCenterRecords.value = costCenters.items.filter(item => item.isActive)
    contactRecords.value = contacts.items.filter(item => item.isActive)
    tagRecords.value = tags.items.filter(item => item.isActive)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Não foi possível carregar as opções do formulário.')
  } finally {
    optionsLoading.value = false
  }
}

function updateField<K extends keyof FinancialEntryFormValues>(field: K, value: FinancialEntryFormValues[K]) {
  setFieldValue(field as never, value as never)
  void validateField(field)
}

function updateDirection(value: unknown) {
  updateField('direction', String(value) as FinancialEntryFormValues['direction'])
}

function updateType(value: unknown) {
  const type = String(value) as FinancialEntryFormValues['type']

  updateField('type', type)

  if (type === 'TRANSFER') {
    updateField('direction', '')
    updateField('categoryId', '')
    updateField('subcategoryId', '')
    updateField('contactId', '')
    updateField('tagIds', [])
    updateField('recurrenceType', 'ONE_TIME')
    updateField('recurrenceTotal', '')
  }
}

function updateRecurrenceType(value: unknown) {
  const recurrenceType = String(value) as FinancialEntryFormValues['recurrenceType']

  updateField('recurrenceType', recurrenceType)

  if (recurrenceType === 'ONE_TIME') {
    updateField('recurrenceTotal', '')
  }
}

function updateStringField(field: keyof FinancialEntryFormValues, value: unknown) {
  updateField(field, String(value) as never)
}

function toggleTag(tagId: string, selected: boolean) {
  const nextTagIds = selected
    ? [...new Set([...values.tagIds, tagId])]
    : values.tagIds.filter(currentTagId => currentTagId !== tagId)

  updateField('tagIds', nextTagIds)
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
  :title="modalTitle"
  :loading="loading || optionsLoading"
  :error-message="errorMessage"
  :class="fin.modal"
  error-title="Lançamentos"
  :save-label="saveLabel"
  @update:open="$emit('update:open', $event)"
  @submit="submit"
)
  dd-card(tag="article" noborder flat)
    dd-stack(compact)
      dd-alert(
        v-if="!isEditing"
        info
        title="Criação de lançamentos"
        :closable="false"
        icon
      ) Nesta etapa criamos lançamentos simples, transferências e séries finitas. A edição em massa de recorrências entra em um bloco próprio.

      dd-center(v-if="optionsLoading")
        dd-loading(label="Carregando formulário...")

      template(v-else)
        dd-grid
          dd-select(
            v-if="!isTransfer"
            :model-value="values.direction"
            label="Direção"
            required
            placeholder="Selecione"
            :options="directionOptions"
            :is-invalid="Boolean(getError('direction'))"
            :error-message="getError('direction')"
            @update:model-value="updateDirection"
          )

          dd-select(
            :model-value="values.type"
            label="Tipo"
            required
            placeholder="Selecione"
            :options="typeOptions"
            :is-invalid="Boolean(getError('type'))"
            :error-message="getError('type')"
            @update:model-value="updateType"
          )

        dd-input(
          :model-value="values.description"
          label="Descrição"
          required
          placeholder="Ex.: Mensalidade de julho, aluguel, energia, etc."
          :is-invalid="Boolean(getError('description'))"
          :error-message="getError('description')"
          @update:model-value="updateStringField('description', $event)"
        )

        dd-grid
          dd-input(
            :model-value="values.amount"
            label="Valor"
            required
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            :is-invalid="Boolean(getError('amount'))"
            :error-message="getError('amount')"
            @update:model-value="updateStringField('amount', $event)"
          )

          dd-select(
            :model-value="values.accountId"
            :label="isTransfer ? 'Conta de origem' : 'Conta prevista'"
            required
            placeholder="Selecione"
            :options="accountOptions"
            :is-invalid="Boolean(getError('accountId'))"
            :error-message="getError('accountId')"
            @update:model-value="updateStringField('accountId', $event)"
          )

          dd-select(
            v-if="isTransfer"
            :model-value="values.transferTargetAccountId"
            label="Conta de destino"
            required
            placeholder="Selecione"
            :options="accountOptions"
            :is-invalid="Boolean(getError('transferTargetAccountId'))"
            :error-message="getError('transferTargetAccountId')"
            @update:model-value="updateStringField('transferTargetAccountId', $event)"
          )

        dd-grid
          dd-input(
            :model-value="values.competenceDate"
            label="Competência"
            required
            type="date"
            :is-invalid="Boolean(getError('competenceDate'))"
            :error-message="getError('competenceDate')"
            @update:model-value="updateStringField('competenceDate', $event)"
          )

          dd-input(
            :model-value="values.scheduledDueDate"
            label="Vencimento planejado"
            required
            type="date"
            :is-invalid="Boolean(getError('scheduledDueDate'))"
            :error-message="getError('scheduledDueDate')"
            @update:model-value="updateStringField('scheduledDueDate', $event)"
          )

        dd-grid(v-if="!isTransfer")
          dd-select(
            :model-value="values.categoryId"
            label="Categoria"
            required
            placeholder="Selecione"
            :options="categoryOptions"
            :is-invalid="Boolean(getError('categoryId'))"
            :error-message="getError('categoryId')"
            @update:model-value="updateStringField('categoryId', $event)"
          )

          dd-select(
            :model-value="values.subcategoryId"
            label="Subcategoria"
            placeholder="Selecione"
            :options="subcategoryOptions"
            :is-invalid="Boolean(getError('subcategoryId'))"
            :error-message="getError('subcategoryId')"
            @update:model-value="updateStringField('subcategoryId', $event)"
          )

        dd-grid(v-if="!isTransfer")
          dd-select(
            :model-value="values.costCenterId"
            label="Centro de custo"
            placeholder="Selecione"
            :options="costCenterOptions"
            @update:model-value="updateStringField('costCenterId', $event)"
          )

          dd-select(
            :model-value="values.contactId"
            label="Contato"
            placeholder="Selecione"
            :options="contactOptions"
            @update:model-value="updateStringField('contactId', $event)"
          )

        dd-grid(v-if="!isEditing && !isTransfer")
          dd-select(
            :model-value="values.recurrenceType"
            label="Repetição"
            required
            placeholder="Selecione"
            :options="recurrenceOptions"
            :is-invalid="Boolean(getError('recurrenceType'))"
            :error-message="getError('recurrenceType')"
            @update:model-value="updateRecurrenceType"
          )

          dd-select(
            v-if="isRecurring"
            :model-value="values.recurrenceFrequency"
            label="Frequência"
            required
            placeholder="Selecione"
            :options="frequencyOptions"
            :is-invalid="Boolean(getError('recurrenceFrequency'))"
            :error-message="getError('recurrenceFrequency')"
            @update:model-value="updateStringField('recurrenceFrequency', $event)"
          )

          dd-input(
            v-if="isRecurring"
            :model-value="values.recurrenceTotal"
            :label="values.recurrenceType === 'INSTALLMENT' ? 'Parcelas' : 'Ocorrências'"
            required
            type="number"
            min="2"
            max="120"
            step="1"
            placeholder="Ex.: 12"
            :is-invalid="Boolean(getError('recurrenceTotal'))"
            :error-message="getError('recurrenceTotal')"
            @update:model-value="updateStringField('recurrenceTotal', $event)"
          )

        dd-textarea(
          :model-value="values.notes"
          label="Observações"
          placeholder="Informações adicionais do lançamento."
          @update:model-value="updateStringField('notes', $event)"
        )

        dd-stack(v-if="!isTransfer && tagOptions.length" compact)
          strong(:class="fin.sectionTitle") Tags
          dd-cluster(compact)
            dd-checkbox(
              v-for="tag in tagOptions"
              :key="tag.value"
              :model-value="values.tagIds.includes(tag.value)"
              @update:model-value="toggleTag(tag.value, Boolean($event))"
            ) {{ tag.label }}

        dd-alert(
          v-if="!isTransfer"
          info
          title="Vencimento efetivo"
          :closable="false"
          icon
        ) O sistema ajusta automaticamente o vencimento quando a data cair em domingo ou em um dia não útil cadastrado.

        dd-alert(
          v-else
          info
          title="Transferência"
          :closable="false"
          icon
        ) Transferências criam uma saída na conta de origem e uma entrada vinculada na conta de destino. Elas não exigem categoria e não entram no DRE.
</template>

<style module="fin">
.modal {
  --dd-modal-inline-size: min(58rem, calc(100vw - 2rem));
  --dd-modal-max-inline-size: min(58rem, calc(100vw - 2rem));
  max-block-size: 50rem;
}

.sectionTitle {
  font-size: v('font-size.sm');
}
</style>
