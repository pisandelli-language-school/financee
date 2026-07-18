<script setup lang="ts">
import { useForm } from 'vee-validate'
import type { UserAccessFormValues } from '~/types/auth'
import { cloneUserAccessForm, userAccessValidationSchema } from '~/validators/auth-user'

interface RoleOption {
  label: string
  value: string
}

const props = defineProps<{
  open: boolean
  title?: string
  modelValue: UserAccessFormValues
  roleOptions: RoleOption[]
  userName: string
  userEmail: string
  googleWorkspaceRole: string
  isWorkspaceAdmin: boolean
  errorMessage?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:modelValue', value: UserAccessFormValues): void
  (event: 'save'): void
}>()

const {
  errors,
  values,
  handleSubmit,
  resetForm,
  setFieldValue,
  submitCount,
  validateField,
} = useForm<UserAccessFormValues>({
  validationSchema: userAccessValidationSchema,
  initialValues: cloneUserAccessForm(props.modelValue),
})

watch(
  () => [props.open, props.modelValue] as const,
  ([open]) => {
    if (!open) {
      return
    }

    resetForm({
      values: cloneUserAccessForm(props.modelValue),
    })
  },
  { deep: true },
)

const submit = handleSubmit((submittedValues) => {
  emit('update:modelValue', cloneUserAccessForm(submittedValues))
  emit('save')
})

const workspaceRoleLabel = computed(() => {
  if (props.googleWorkspaceRole === 'ADMIN') {
    return 'Administrador'
  }

  if (props.googleWorkspaceRole === 'MANAGER') {
    return 'Gestor'
  }

  if (props.googleWorkspaceRole === 'TEACHER') {
    return 'Professor'
  }

  return 'Staff'
})

const financeeRoleLabel = computed(() => {
  if (props.isWorkspaceAdmin) {
    return workspaceRoleLabel.value
  }

  const selectedRole = props.roleOptions.find(role => role.value === values.internalRoleId)

  if (selectedRole) {
    return selectedRole.label
  }

  return 'Sem papel'
})

function updateField<K extends keyof UserAccessFormValues>(field: K, value: UserAccessFormValues[K]) {
  setFieldValue(field as never, value as never)
  void validateField(field)
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
  :title="title ?? 'Gerenciar acesso'"
  :loading="loading"
  :error-message="errorMessage"
  error-title="Usuários"
  save-label="Salvar acesso"
  @update:open="$emit('update:open', $event)"
  @submit="submit"
)
  dd-stack(compact)
    dd-stack(compact nogap)
      strong {{ userName }}
      span {{ userEmail }}
    template(v-if="loading")
      dd-center
        dd-loading(label="Carregando acesso...")
    template(v-else)
      dd-cluster(compact)
        dd-badge(info) {{ financeeRoleLabel }}

      dd-select(
        :model-value="values.internalRoleId"
        label="Papel interno"
        placeholder="Selecione"
        :options="roleOptions"
        :is-invalid="Boolean(getError('internalRoleId'))"
        :error-message="getError('internalRoleId')"
        @update:model-value="updateField('internalRoleId', String($event ?? ''))"
      )

      dd-checkbox(
        :model-value="values.isActive"
        @update:model-value="updateField('isActive', Boolean($event))"
      ) Usuário ativo
</template>
