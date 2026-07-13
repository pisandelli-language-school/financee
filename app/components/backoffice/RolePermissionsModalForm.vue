<script setup lang="ts">
import type { PermissionCatalogRecord, RolePermissionsFormValues } from '~/types/auth'

const props = defineProps<{
  open: boolean
  title?: string
  roleName: string
  modelValue: RolePermissionsFormValues
  permissions: PermissionCatalogRecord[]
  errorMessage?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:modelValue', value: RolePermissionsFormValues): void
  (event: 'save'): void
}>()

const selectedPermissionKeys = ref<string[]>([...props.modelValue.permissionKeys])
const moduleFilter = ref('')

const moduleOptions = computed(() => [
  { label: 'Todos os módulos', value: '' },
  ...Array.from(new Set(props.permissions.map(permission => permission.module)))
    .sort((left, right) => left.localeCompare(right))
    .map(module => ({
      label: formatModuleLabel(module),
      value: module,
    })),
])

const filteredPermissions = computed(() => props.permissions.filter((permission) => {
  if (!moduleFilter.value) {
    return true
  }

  return permission.module === moduleFilter.value
}))

watch(
  () => [props.open, props.modelValue.permissionKeys] as const,
  ([open, permissionKeys]) => {
    if (!open) {
      return
    }

    selectedPermissionKeys.value = [...permissionKeys]
    moduleFilter.value = ''
  },
  { deep: true },
)

function togglePermission(permissionKey: string, checked: boolean) {
  const next = new Set(selectedPermissionKeys.value)

  if (checked) {
    next.add(permissionKey)
  } else {
    next.delete(permissionKey)
  }

  selectedPermissionKeys.value = Array.from(next).sort((left, right) => left.localeCompare(right))
}

function submit() {
  emit('update:modelValue', {
    permissionKeys: [...selectedPermissionKeys.value],
  })
  emit('save')
}

function formatModuleLabel(moduleName: string) {
  return moduleName
    .split('-')
    .join(' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function formatPermissionLabel(permission: PermissionCatalogRecord) {
  const actionMap: Record<string, string> = {
    view: 'Visualizar',
    create: 'Criar',
    update: 'Editar',
    delete: 'Excluir',
    pay: 'Marcar pagamento',
    cancel: 'Cancelar',
    generate: 'Gerar',
    renew: 'Renovar',
    export: 'Exportar',
    manage: 'Gerenciar',
    run: 'Executar',
  }

  return actionMap[permission.action] ?? permission.key
}
</script>

<template lang="pug">
backoffice-modal-form-shell(
  :open="open"
  :title="title ?? 'Editar permissões'"
  :loading="loading"
  :error-message="errorMessage"
  error-title="Permissões"
  save-label="Salvar permissões"
  @update:open="$emit('update:open', $event)"
  @submit="submit"
)
  dd-stack(compact)
    dd-stack(compact nogap)
      strong {{ roleName }}
      span Ajuste o conjunto de permissões deste papel.

    dd-select(
      :model-value="moduleFilter"
      placeholder="Todos os módulos"
      :options="moduleOptions"
      @update:model-value="moduleFilter = String($event ?? '')"
    )

    dd-stack(compact)
      dd-card(
        v-for="permission in filteredPermissions"
        :key="permission.id"
        tag="article"
        noborder
        flat
      )
        dd-checkbox(
          :model-value="selectedPermissionKeys.includes(permission.key)"
          @update:model-value="togglePermission(permission.key, Boolean($event))"
        )
          dd-stack(compact nogap)
            strong {{ formatPermissionLabel(permission) }}
            span {{ permission.key }}
</template>
