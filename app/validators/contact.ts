import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
  contactNatureOptions,
  contactRoleOptions,
  documentTypeOptions,
  type ContactFormValues,
  type ContactDocumentType,
  type ContactNature,
  type ContactRole,
} from '~/types/backoffice'

type ContactValidationContext = z.RefinementCtx

const contactNatureValues = contactNatureOptions.map((option) => option.value) as [ContactNature, ...ContactNature[]]
const contactRoleValues = contactRoleOptions.map((option) => option.value) as [ContactRole, ...ContactRole[]]
const documentTypeValues = documentTypeOptions.map((option) => option.value) as [ContactDocumentType, ...ContactDocumentType[]]

const optionalEmailSchema = z.string().trim().refine((value) => !value || z.string().email().safeParse(value).success, {
  message: 'Informe um e-mail válido.',
})

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function sanitizeCnpj(value: string) {
  const normalized = value.toUpperCase().replace(/[^0-9A-Z]/g, '')
  const base = normalized.slice(0, 12)
  const checkDigits = normalized.slice(12).replace(/\D/g, '').slice(0, 2)
  return `${base}${checkDigits}`
}

function addIssue(ctx: ContactValidationContext, path: (string | number)[], message: string) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message,
  })
}

function validateSharedRequiredFields(value: ContactFormValues, ctx: ContactValidationContext) {
  const requiresBusinessContactData = value.nature === 'INDIVIDUAL' || value.nature === 'COMPANY'
  const phoneDigits = onlyDigits(value.phone)

  if (!requiresBusinessContactData) {
    return
  }

  if (!value.email.trim()) {
    addIssue(ctx, ['email'], 'Informe o e-mail.')
  }

  if (!phoneDigits) {
    addIssue(ctx, ['phone'], 'Informe o telefone.')
  }

  if (!value.roles.length) {
    addIssue(ctx, ['roles'], 'Selecione ao menos uma classificação.')
  }
}

function validateIndividualRules(value: ContactFormValues, ctx: ContactValidationContext) {
  if (value.nature !== 'INDIVIDUAL') {
    return
  }

  const documentDigits = onlyDigits(value.document)

  if (!documentDigits && !value.birthDate) {
    addIssue(ctx, ['document'], 'Informe CPF ou data de nascimento.')
  }

  if (documentDigits && documentDigits.length !== 11) {
    addIssue(ctx, ['document'], 'CPF inválido.')
  }
}

function validateCompanyRules(value: ContactFormValues, ctx: ContactValidationContext) {
  if (value.nature !== 'COMPANY') {
    return
  }

  const documentAlpha = sanitizeCnpj(value.document)

  if (!documentAlpha) {
    addIssue(ctx, ['document'], 'Pessoa jurídica deve informar CNPJ.')
  } else if (documentAlpha.length !== 14) {
    addIssue(ctx, ['document'], 'CNPJ inválido.')
  }

  if (!value.financialResponsible.name.trim()) {
    addIssue(ctx, ['financialResponsible', 'name'], 'Informe o nome do responsável financeiro.')
  }

  if (!value.financialResponsible.email.trim()) {
    addIssue(ctx, ['financialResponsible', 'email'], 'Informe o e-mail do responsável financeiro.')
  }
}

function validateForeignRules(value: ContactFormValues, _ctx: ContactValidationContext) {
  if (value.nature !== 'FOREIGN') {
    return
  }
}

function validatePhoneRules(value: ContactFormValues, ctx: ContactValidationContext) {
  const phoneDigits = onlyDigits(value.phone)
  const financialPhoneDigits = onlyDigits(value.financialResponsible.phone)

  if (phoneDigits && ![10, 11].includes(phoneDigits.length)) {
    addIssue(ctx, ['phone'], 'Telefone inválido.')
  }

  if (financialPhoneDigits && ![10, 11].includes(financialPhoneDigits.length)) {
    addIssue(ctx, ['financialResponsible', 'phone'], 'Telefone inválido.')
  }
}

function validatePostalCodeRules(value: ContactFormValues, ctx: ContactValidationContext) {
  const postalCodeDigits = onlyDigits(value.address.postalCode)

  if (postalCodeDigits && postalCodeDigits.length !== 8) {
    addIssue(ctx, ['address', 'postalCode'], 'CEP inválido.')
  }
}

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Nome do contato é obrigatório.'),
  tradeName: z.string(),
  document: z.string(),
  documentType: z.union([z.literal(''), z.enum(documentTypeValues)]),
  nature: z.enum(contactNatureValues),
  roles: z.array(z.enum(contactRoleValues)),
  birthDate: z.string(),
  municipalRegistration: z.string(),
  email: optionalEmailSchema,
  phone: z.string(),
  notes: z.string(),
  isActive: z.boolean(),
  address: z.object({
    country: z.string(),
    state: z.string(),
    city: z.string(),
    postalCode: z.string(),
    street: z.string(),
    number: z.string(),
    complement: z.string(),
    district: z.string(),
  }),
  financialResponsible: z.object({
    name: z.string(),
    email: optionalEmailSchema,
    phone: z.string(),
    role: z.string(),
  }),
}).superRefine((value, ctx) => {
  validateSharedRequiredFields(value, ctx)
  validateIndividualRules(value, ctx)
  validateCompanyRules(value, ctx)
  validateForeignRules(value, ctx)
  validatePhoneRules(value, ctx)
  validatePostalCodeRules(value, ctx)
})

export const contactValidationSchema = toTypedSchema(contactSchema)
