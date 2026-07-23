<script setup lang="ts">
import { useForm } from 'vee-validate'
import { FinancialInstitutionModule } from '~/api/backoffice'
import { accountTypeOptions, type AccountFormValues, type FinancialInstitutionRecord } from '~/types/backoffice'
import { cloneAccountForm, accountValidationSchema } from '~/validators/account'
import { getInstitutionLogoByKey } from '~/utils/account-institutions'

const props = defineProps<{
  open: boolean
  title: string
  modelValue: AccountFormValues
  loading?: boolean
  errorMessage?: string
  isEditing?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:modelValue', value: AccountFormValues): void
  (event: 'save'): void
}>()

const institutions = ref<FinancialInstitutionRecord[]>([])
const institutionsLoading = ref(false)
const step = ref<'picker' | 'form'>('picker')

const typeOptions = computed(() => accountTypeOptions.map(option => ({ ...option })))

const {
  errors,
  values,
  handleSubmit,
  resetForm,
  setFieldValue,
  submitCount,
  validateField,
} = useForm<AccountFormValues>({
  validationSchema: accountValidationSchema,
  initialValues: cloneAccountForm(props.modelValue),
})

const selectedInstitution = computed(() => institutions.value.find(
  institution => institution.id === values.institutionId,
) ?? null)

const selectedInstitutionLogo = computed(() => getInstitutionLogoByKey(selectedInstitution.value?.logoKey))
const isManualMode = computed(() => !selectedInstitution.value)

const previewTitle = computed(() => {
  if (selectedInstitution.value) {
    return selectedInstitution.value.name
  }

  return values.name.trim() || 'Nova conta'
})

watch(
  () => [props.open, props.modelValue, props.isEditing] as const,
  async ([open, modelValue, isEditing]) => {
    if (!open) {
      return
    }

    resetForm({
      values: cloneAccountForm(modelValue),
    })

    step.value = isEditing ? 'form' : 'picker'
    await ensureInstitutionsLoaded()
  },
  { deep: true },
)

const submit = handleSubmit((submittedValues) => {
  emit('update:modelValue', cloneAccountForm(submittedValues))
  emit('save')
})

async function ensureInstitutionsLoaded() {
  if (institutions.value.length || institutionsLoading.value) {
    return
  }

  institutionsLoading.value = true

  try {
    const response = await FinancialInstitutionModule.list({
      search: '',
      page: 1,
      pageSize: 50,
    })

    institutions.value = response.items.filter(item => item.isActive)
  } finally {
    institutionsLoading.value = false
  }
}

function updateField<K extends keyof AccountFormValues>(field: K, value: AccountFormValues[K]) {
  if (field === 'isActive' && value === false) {
    setFieldValue('alertOnLowBalance' as never, false as never)
  }

  setFieldValue(field as never, value as never)
  void validateField(field)
}

function updateInitialValue(value: unknown) {
  if (value === '' || value == null) {
    updateField('initialValue', null)
    return
  }

  const parsed = Number(value)
  updateField('initialValue', Number.isFinite(parsed) ? parsed : null)
}

function selectInstitution(institution: FinancialInstitutionRecord) {
  resetForm({
    values: {
      ...values,
      institutionId: institution.id,
      name: values.name.trim() || institution.name,
    },
  })
  step.value = 'form'
}

function chooseManual() {
  resetForm({
    values: {
      ...values,
      institutionId: '',
    },
  })
  step.value = 'form'
}

function goBack() {
  if (step.value === 'picker') {
    emit('update:open', false)
    return
  }

  step.value = 'picker'
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
  :loading="loading"
  :error-message="errorMessage"
  :class="fin.modal"
  error-title="Conta"
  save-label="Salvar conta"
  @update:open="$emit('update:open', $event)"
  @submit="submit"
)
  dd-stack(v-if="step === 'picker'" compact :class="fin.pickerStep")
    dd-stack(compact nogap :class="fin.centerHeader")
      strong Escolha a instituição
      span(:class="fin.stepHint") Selecione um banco pré-cadastrado ou continue manualmente.

    dd-grid(:class="fin.institutionGrid")
      button(
        v-for="institution in institutions"
        :key="institution.id"
        type="button"
        :class="fin.institutionCard"
        @click="selectInstitution(institution)"
      )
        dd-cluster(compact :class="fin.institutionContent")
          dd-avatar(
            large
            :class="fin.logoAvatar"
            :src="getInstitutionLogoByKey(institution.logoKey)"
            :alt="institution.name"
          )
          dd-stack(compact nogap :class="fin.institutionText")
            strong {{ institution.name }}
            span(:class="fin.institutionType") Conta bancária

      button(
        type="button"
        :class="[fin.institutionCard, fin.manualCard]"
        @click="chooseManual"
      )
        dd-stack(compact nogap :class="fin.manualCardContent")
          span(:class="fin.manualCardIcon") +
          strong Cadastrar manualmente
          span(:class="fin.institutionType") Criar conta sem instituição pré-cadastrada

    dd-cluster(v-if="institutionsLoading" :class="fin.centerActions")
      dd-loading Carregando instituições...

  dd-stack(v-else compact)
    dd-card(flat :class="fin.previewCard")
      dd-cluster(compact :class="fin.previewHeader")
        dd-avatar(
          v-if="selectedInstitutionLogo"
          large
          :class="fin.logoAvatar"
          :src="selectedInstitutionLogo"
          :alt="previewTitle"
        )
        dd-avatar(v-else large random :class="fin.logoAvatar" :alt="previewTitle")
        dd-stack(compact nogap :class="fin.previewText")
          strong(:class="fin.previewTitle") {{ previewTitle }}
          span(:class="fin.previewMeta") {{ isManualMode ? 'Conta manual' : 'Instituição selecionada' }}

    dd-grid
      dd-form-input(
        name="name"
        label="Nome da conta"
        required
        placeholder="Digite o nome da conta"
      )
      dd-select(
        :model-value="values.type"
        label="Tipo"
        required
        placeholder="Selecione"
        :options="typeOptions"
        :is-invalid="Boolean(getError('type'))"
        :error-message="getError('type')"
        @update:model-value="updateField('type', String($event ?? ''))"
      )

    dd-grid
      dd-input(
        :model-value="values.initialValue ?? ''"
        label="Saldo inicial"
        type="number"
        placeholder="0.00"
        @update:model-value="updateInitialValue"
      )
      dd-input(
        :model-value="values.contactPhone"
        label="Telefone"
        placeholder="(00) 00000-0000"
        :is-invalid="Boolean(getError('contactPhone'))"
        :error-message="getError('contactPhone')"
        @update:model-value="updateField('contactPhone', String($event))"
      )

    dd-input(
      :model-value="values.contactEmail"
      label="E-mail"
      placeholder="contato@banco.com"
      :is-invalid="Boolean(getError('contactEmail'))"
      :error-message="getError('contactEmail')"
      @update:model-value="updateField('contactEmail', String($event))"
    )

    dd-cluster(compact :class="fin.checkboxRow")
      dd-checkbox(
        :model-value="values.isActive"
        @update:model-value="updateField('isActive', Boolean($event))"
      ) Conta ativa
      dd-checkbox(
        :model-value="values.alertOnLowBalance"
        :disabled="!values.isActive"
        @update:model-value="updateField('alertOnLowBalance', Boolean($event))"
      ) Receber alertas quando o saldo estiver baixo

    dd-textarea(
      :model-value="values.notes"
      label="Observações"
      :rows="4"
      placeholder="Adicione informações adicionais sobre esta conta"
      :is-invalid="Boolean(getError('notes'))"
      :error-message="getError('notes')"
      @update:model-value="updateField('notes', String($event))"
    )

  template(#footer)
    dd-cluster(between)
      dd-button(
        outline
        type="button"
        icon="lucide:arrow-left"
        @click="goBack"
      ) {{ step === 'picker' ? 'Cancelar' : 'Voltar' }}
      dd-button(
        v-if="step === 'form'"
        primary
        type="button"
        :disabled="loading"
        icon="lucide:save"
        @click="submit"
      ) Salvar conta
</template>

<style module="fin">
.modal {
  --dd-modal-inline-size: min(56rem, calc(100vw - 2rem));
  --dd-modal-max-inline-size: min(56rem, calc(100vw - 2rem));
  max-block-size: 58rem;
}

.pickerStep {
  min-block-size: 24rem;
}

.centerHeader {
  align-items: center;
  text-align: center;
}

.centerActions {
  justify-content: center;
}

.stepHint,
.institutionType,
.previewMeta {
  color: var(--dd-color-gray);
  font-size: v('font-size.sm');
}

.institutionGrid {
  --dd-grid-column-min-width: 15.5rem;
}

.institutionCard {
  background: v('color.bg.surface');
  border: v('border-width.sm') solid v('color.border.default');
  border-radius: v('border-radius.lg');
  cursor: pointer;
  inline-size: 100%;
  padding: v('space.md');
  text-align: start;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:is(:hover, :focus-visible) {
    background: v('color.primary.50');
    border-color: v('color.primary.300');
    box-shadow: v('shadow.xl');
  }
}

.institutionContent,
.previewHeader {
  align-items: center;
  flex-wrap: nowrap;
  gap: v('space.sm');
}

.previewText {
  min-inline-size: 0;
}

.logoAvatar {
  --dd-avatar-background-color: transparent;
}

.institutionText {
  min-inline-size: 0;
}

.manualCard {
  background: v('color.bg.surface');
  border-style: dashed;
  border-color: v('color.primary.300');

  &:is(:hover, :focus-visible) {
    background: v('color.primary.50');
    border-color: v('color.primary.400');
  }
}

.manualCardContent {
  align-items: center;
  block-size: 100%;
  color: v('color.primary.700');
  justify-content: center;
  min-block-size: 100%;
  text-align: center;
}

.manualCardIcon {
  align-items: center;
  background: v('color.primary.100');
  border-radius: 999px;
  display: inline-flex;
  font-size: v('font-size.xl');
  font-weight: v('font-weight.semi-bold');
  inline-size: 2.75rem;
  justify-content: center;
  line-height: 1;
  min-block-size: 2.75rem;
}

.previewCard {
  --dd-card-body-padding: v('space.xs');

  background: v('color.primary.50');
  border: v('border-width.sm') solid v('color.primary.200');
}

.checkboxRow {
  align-items: center;
  flex-wrap: wrap;
  gap: v('space.lg');
}

.previewTitle {
  font-size: var(--dd-font-size-base);
  font-weight: v('font-weight.semi-bold');
  line-height: v('line-height.tight');
}

</style>
