<script setup lang="ts">
import { useForm } from 'vee-validate'
import {
  contactNatureOptions,
  contactRoleOptions,
  type ContactFormValues,
} from '~/types/backoffice'
import {
  formatDocument,
  formatPhone,
  formatPostalCode,
  onlyDigits,
} from '~/utils/contactFormatters'
import { contactValidationSchema } from '~/validators/contact'

const props = defineProps<{
  open: boolean
  modelValue: ContactFormValues
  title?: string
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'save', value: ContactFormValues): void
}>()


const natureOptions = computed(() => contactNatureOptions.map((option) => ({ ...option })))
const roleOptions = computed(() => contactRoleOptions.map((option) => ({ ...option })))

const {
  errors,
  values,
  handleSubmit,
  resetForm,
  setFieldValue,
  setFieldError,
  submitCount,
  validateField,
} = useForm<ContactFormValues>({
  validationSchema: contactValidationSchema,
  initialValues: cloneForm(props.modelValue),
})

const isCompany = computed(() => values.nature === 'COMPANY')
const isIndividual = computed(() => values.nature === 'INDIVIDUAL')
const documentLabel = computed(() => {
  if (isCompany.value) {
    return 'CNPJ'
  }

  if (isIndividual.value) {
    return 'CPF'
  }

  return 'Documento'
})
const documentRequired = computed(() => isCompany.value || isIndividual.value)
const {
  state: postalCodeLookupState,
  message: postalCodeLookupMessage,
  lookup: lookupPostalCode,
  reset: resetPostalCodeLookup,
} = usePostalCodeLookup({
  onSuccess(address) {
    setAddressField('street', address.street)
    setAddressField('district', address.district)
    setAddressField('city', address.city)
    setAddressField('state', address.state)
    setAddressField('country', address.country)
  },
  onNotFound() {
    setFieldError('address.postalCode', 'CEP não encontrado.')
  },
})

const normalizedPostalCode = computed(() => onlyDigits(values.address.postalCode))

watch(
  () => [props.open, props.modelValue] as const,
  ([open]) => {
    if (!open) {
      return
    }

    resetPostalCodeLookup()
    resetForm({
      values: cloneForm(props.modelValue),
    })
  },
  { deep: true },
)

watch(normalizedPostalCode, (postalCode) => {
  if (postalCode.length !== 8) {
    resetPostalCodeLookup()
    return
  }

  void lookupPostalCode(postalCode)
})

const submit = handleSubmit((submittedValues) => {
  emit('save', cloneForm(submittedValues))
})

function cloneForm(form: ContactFormValues): ContactFormValues {
  return {
    ...form,
    roles: [...form.roles],
    address: {
      ...form.address,
    },
    financialResponsible: {
      ...form.financialResponsible,
    },
  }
}

function updateField<K extends keyof ContactFormValues>(field: K, value: ContactFormValues[K]) {
  setFieldValue(field as never, value as never)
  void validateField(field)
}

function updateNature(value: unknown) {
  const nextNature = String(value) as ContactFormValues['nature']

  updateField('nature', nextNature)
  updateField('document', formatDocument(values.document, nextNature))

  if (nextNature !== 'COMPANY') {
    setFinancialField('name', '')
    setFinancialField('email', '')
    setFinancialField('phone', '')
    setFinancialField('role', '')
  }
}

function updateRoles(value: unknown) {
  setFieldValue('roles', Array.isArray(value) ? value as ContactFormValues['roles'] : [])
  void validateField('roles')
}

function setAddressField<K extends keyof ContactFormValues['address']>(
  field: K,
  value: ContactFormValues['address'][K],
) {
  setFieldValue(`address.${field}` as never, value as never)
  void validateField(`address.${field}`)
}

function setFinancialField<K extends keyof ContactFormValues['financialResponsible']>(
  field: K,
  value: ContactFormValues['financialResponsible'][K],
) {
  setFieldValue(`financialResponsible.${field}` as never, value as never)
  void validateField(`financialResponsible.${field}`)
}

function updateDocument(value: unknown) {
  updateField('document', formatDocument(String(value), values.nature))
}

function updatePhone(value: unknown) {
  updateField('phone', formatPhone(String(value)))
}

function updatePostalCode(value: unknown) {
  setAddressField('postalCode', formatPostalCode(String(value)))
}

function updateFinancialPhone(value: unknown) {
  setFinancialField('phone', formatPhone(String(value)))
}

function getError(path: keyof typeof errors.value | string) {
  if (!submitCount.value) {
    return ''
  }

  return errors.value[path as keyof typeof errors.value] ?? ''
}
</script>

<template lang="pug">
dd-modal(
  :open="open"
  :title="title ?? 'Novo contato'"
  :class="fin.modal"
  @update:open="$emit('update:open', $event)"
)
  form(:class="fin.form" @submit.prevent="submit")
    dd-stack(compact)
      dd-alert(
        v-if="errorMessage"
        danger
        title="Contato"
        :closable="false"
        icon
      ) {{ errorMessage }}

      dd-card(tag='article' noborder flat :class='fin.card')
        dd-stack(compact)
          dd-cluster(compact :class="fin.sectionHeader")
            icon(name="lucide:user-round")
            strong Dados básicos

          dd-grid
            dd-select(
              :model-value="values.nature"
              label="Tipo de pessoa"
              :options="natureOptions"
              :is-invalid="Boolean(getError('nature'))"
              :error-message="getError('nature')"
              @update:model-value="updateNature"
            )
            dd-stack(compact nogap)
              dd-form-label
                | {{ documentLabel }}
                span(v-if="documentRequired" :class="fin.requiredMark")  *
              dd-input(
                :model-value="values.document"
                placeholder="Documento principal"
                :is-invalid="Boolean(getError('document'))"
                :error-message="getError('document')"
                @update:model-value="updateDocument"
              )
          dd-grid
            dd-stack(compact nogap)
              dd-form-label
                | {{ isCompany ? 'Razão social' : 'Nome' }}
                span(:class="fin.requiredMark")  *
              dd-form-input(
                name="name"
                placeholder="Digite o nome"
              )

            dd-input(
              v-if="isCompany"
              :model-value="values.tradeName"
              label="Nome fantasia"
              placeholder="Opcional"
              :is-invalid="Boolean(getError('tradeName'))"
              :error-message="getError('tradeName')"
              @update:model-value="updateField('tradeName', String($event))"
            )
          dd-grid
            dd-stack(compact nogap)
              dd-form-label
                | E-mail
                span(v-if="isIndividual || isCompany" :class="fin.requiredMark")  *
              dd-form-input(
                name="email"
                placeholder="email@exemplo.com"
              )
            dd-stack(compact nogap)
              dd-form-label
                | Telefone
                span(v-if="isIndividual || isCompany" :class="fin.requiredMark")  *
              dd-input(
                :model-value="values.phone"
                placeholder="(00) 00000-0000"
                :is-invalid="Boolean(getError('phone'))"
                :error-message="getError('phone')"
                @update:model-value="updatePhone"
              )

            dd-grid(v-if="isIndividual || isCompany" :class="fin.gridTwo")
              div(v-if="isIndividual")
                dd-input(
                  :model-value="values.birthDate"
                  label="Data de nascimento"
                  type="date"
                  :is-invalid="Boolean(getError('birthDate'))"
                  :error-message="getError('birthDate')"
                  @update:model-value="updateField('birthDate', String($event))"
                )
              div(v-if="isCompany")
                dd-input(
                  :model-value="values.municipalRegistration"
                  label="Inscrição municipal"
                  placeholder="Opcional"
                  :is-invalid="Boolean(getError('municipalRegistration'))"
                  :error-message="getError('municipalRegistration')"
                  @update:model-value="updateField('municipalRegistration', String($event))"
                )
          dd-grid
            dd-stack(compact)
              dd-form-label
                | Classificação
                span(v-if="isIndividual || isCompany" :class="fin.requiredMark")  *
              dd-cluster(compact :class="fin.roles")
                dd-checkbox(
                  v-for="roleOption in roleOptions"
                  :key="roleOption.value"
                  :model-value="values.roles"
                  :value="roleOption.value"
                  @update:model-value="updateRoles"
                ) {{ roleOption.label }}
              small(v-if="getError('roles')" :class="fin.inlineError") {{ getError('roles') }}

          dd-checkbox(
            :model-value="values.isActive"
            @update:model-value="updateField('isActive', Boolean($event))"
          ) Contato ativo

          dd-stack(compact)
            dd-cluster(compact :class="fin.sectionHeader")
              icon(name="lucide:map-pin")
              strong Endereço

            dd-grid
              dd-input(
                :model-value="values.address.street"
                label="Logradouro"
                placeholder="Rua, Avenida, etc."
                :is-invalid="Boolean(getError('address.street'))"
                :error-message="getError('address.street')"
                @update:model-value="setAddressField('street', String($event))"
              )
              dd-input(
                :model-value="values.address.number"
                label="Número"
                :is-invalid="Boolean(getError('address.number'))"
                :error-message="getError('address.number')"
                @update:model-value="setAddressField('number', String($event))"
              )
              dd-input(
                :model-value="values.address.complement"
                label="Complemento"
                placeholder="Apto, Bloco, etc."
                :is-invalid="Boolean(getError('address.complement'))"
                :error-message="getError('address.complement')"
                @update:model-value="setAddressField('complement', String($event))"
              )
            dd-grid
              dd-input(
                :model-value="values.address.district"
                label="Bairro"
                :is-invalid="Boolean(getError('address.district'))"
                :error-message="getError('address.district')"
                @update:model-value="setAddressField('district', String($event))"
              )
              dd-stack(compact nogap)
                dd-input(
                  :model-value="values.address.postalCode"
                  label="CEP"
                  placeholder="00000-000"
                  :is-invalid="Boolean(getError('address.postalCode'))"
                  :error-message="getError('address.postalCode')"
                  @update:model-value="updatePostalCode"
                )
                small(
                  v-if="postalCodeLookupMessage"
                  :class="postalCodeLookupState === 'error' ? fin.lookupError : fin.lookupInfo"
                ) {{ postalCodeLookupMessage }}

            dd-grid
              dd-input(
                :model-value="values.address.city"
                label="Cidade"
                :is-invalid="Boolean(getError('address.city'))"
                :error-message="getError('address.city')"
                @update:model-value="setAddressField('city', String($event))"
              )
              dd-input(
                :model-value="values.address.state"
                label="UF"
                :is-invalid="Boolean(getError('address.state'))"
                :error-message="getError('address.state')"
                @update:model-value="setAddressField('state', String($event).toUpperCase())"
              )
              dd-input(
                :model-value="values.address.country"
                label="País"
                :is-invalid="Boolean(getError('address.country'))"
                :error-message="getError('address.country')"
                @update:model-value="setAddressField('country', String($event).toUpperCase())"
              )

          dd-stack(v-if="isCompany" compact)
            dd-cluster(compact :class="fin.sectionHeader")
              icon(name="lucide:briefcase-business")
              strong Responsável financeiro

            dd-stack(compact nogap)
              dd-form-label
                | Nome do responsável
                span(:class="fin.requiredMark")  *
              dd-form-input(name="financialResponsible.name")

            dd-grid
              dd-stack(compact nogap)
                dd-form-label
                  | E-mail
                  span(:class="fin.requiredMark")  *
                dd-form-input(name="financialResponsible.email")
              dd-input(
                :model-value="values.financialResponsible.phone"
                label="Telefone"
                placeholder="(00) 00000-0000"
                :is-invalid="Boolean(getError('financialResponsible.phone'))"
                :error-message="getError('financialResponsible.phone')"
                @update:model-value="updateFinancialPhone"
              )
              dd-input(
                :model-value="values.financialResponsible.role"
                label="Cargo"
                :is-invalid="Boolean(getError('financialResponsible.role'))"
                :error-message="getError('financialResponsible.role')"
                @update:model-value="setFinancialField('role', String($event))"
              )

          dd-stack(compact)
            dd-cluster(compact :class="fin.sectionHeader")
              icon(name="lucide:file-text")
              strong Observações

          dd-textarea(
              :model-value="values.notes"
              label="Informações adicionais"
              :rows="5"
              :is-invalid="Boolean(getError('notes'))"
              :error-message="getError('notes')"
              @update:model-value="updateField('notes', String($event))"
            )

  template(#footer)
    dd-cluster(end)
      dd-button(outline type="button" @click="$emit('update:open', false)") Cancelar
      dd-button(primary type="button" :disabled="loading" icon="lucide:save" @click="submit")
        | Salvar contato
</template>

<style module="fin">
.modal {
  --dd-modal-inline-size: min(60rem, calc(100vw - 2rem));
  --dd-modal-max-inline-size: min(60rem, calc(100vw - 2rem));
  --dd-card-body-padding: .3125rem;
  --dd-grid-gap: v('space.sm');
  max-block-size: 50rem;
}

.form {
  display: contents;
}

.sectionHeader {
  --dd-cluster-gap: v('space.xs');
  color: v('color.primary');
  padding-block-end: v('space.xs');
  margin-block-end: v('space.xs');
  border-bottom: 1px solid v('color.border.default');
}

.lookupInfo {
  color: v('color.text.soft');
}

.lookupError,
.requiredMark {
  color: v('color.danger');
}

.inlineError {
  color: v('color.danger');
  font-size: .75rem;
}
</style>
