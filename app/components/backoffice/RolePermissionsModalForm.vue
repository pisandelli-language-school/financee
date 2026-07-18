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

const moduleLabelMap: Record<string, string> = {
  auditoria: 'Auditoria',
  automacoes: 'Automações',
  categorias: 'Categorias',
  contas: 'Contas',
  contatos: 'Contatos',
  contratos: 'Contratos',
  'centros-custo': 'Centros de custo',
  dashboard: 'Dashboard',
  'dias-nao-uteis': 'Dias não úteis',
  'formas-pagamento': 'Formas de pagamento',
  integracoes: 'Integrações',
  jobs: 'Jobs',
  lancamentos: 'Lançamentos',
  notificacoes: 'Notificações',
  permissoes: 'Permissões',
  relatorios: 'Relatórios',
  tags: 'Tags',
  usuarios: 'Usuários',
}

// ⚡ Bolt: Extract expensive grouping/sorting based on static props into its own computed property.
// This prevents re-evaluation of O(N log N) sorting when reactive selection state changes.
const baseGroupedPermissions = computed(() => {
  const groups = props.permissions.reduce((accumulator, permission) => {
    const group = accumulator.get(permission.module) ?? {
      module: permission.module,
      label: formatModuleLabel(permission.module),
      permissions: [] as PermissionCatalogRecord[],
    }

    group.permissions.push(permission)
    accumulator.set(permission.module, group)
    return accumulator
  }, new Map<string, {
    module: string
    label: string
    permissions: PermissionCatalogRecord[]
  }>())

  return Array.from(groups.values())
    .sort((left, right) => left.label.localeCompare(right.label))
    .map(group => ({
      ...group,
      permissions: [...group.permissions].sort((left, right) =>
        formatPermissionLabel(left).localeCompare(formatPermissionLabel(right)),
      ),
    }))
})

// ⚡ Bolt: Compute dynamic selection mapping on top of the memoized base groups.
// Converts array to Set for O(1) lookups instead of O(N*M) array.includes checks during filtering.
const groupedPermissions = computed(() => {
  const selectedSet = new Set(selectedPermissionKeys.value)

  return baseGroupedPermissions.value.map(group => ({
    ...group,
    selectedCount: group.permissions.filter(permission =>
      selectedSet.has(permission.key),
    ).length,
  }))
})

watch(
  () => [props.open, props.modelValue.permissionKeys] as const,
  ([open, permissionKeys]) => {
    if (!open) {
      return
    }

    selectedPermissionKeys.value = [...permissionKeys]
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
  return moduleLabelMap[moduleName] ?? moduleName
}

function formatPermissionLabel(permission: PermissionCatalogRecord) {
  const actionMap: Record<string, string> = {
    view: 'Visualizar',
    create: 'Criar',
    update: 'Editar',
    delete: 'Excluir',
    pay: 'Marcar como pago',
    cancel: 'Cancelar',
    generate: 'Gerar',
    renew: 'Renovar',
    export: 'Exportar',
    manage: 'Gerenciar',
    run: 'Executar',
  }

  const permissionLabelMap: Record<string, string> = {
    'auditoria.view': 'Visualizar auditoria',
    'automacoes.manage': 'Gerenciar automações',
    'contratos.generate': 'Gerar lançamentos',
    'contratos.renew': 'Renovar contrato',
    'dashboard.view': 'Visualizar dashboard',
    'integracoes.manage': 'Gerenciar integrações',
    'jobs.run': 'Executar job',
    'jobs.view': 'Visualizar jobs',
    'lancamentos.cancel': 'Cancelar lançamento',
    'lancamentos.pay': 'Marcar como pago',
    'permissoes.manage': 'Gerenciar permissões',
    'relatorios.export': 'Exportar relatórios',
    'relatorios.view': 'Visualizar relatórios',
    'usuarios.manage': 'Gerenciar usuários',
  }

  return permissionLabelMap[permission.key] ?? actionMap[permission.action] ?? permission.key
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
    template(v-if="loading")
      dd-center
        dd-loading(label="Carregando permissões...")
    template(v-else)
      dd-accordion-group
        dd-accordion(
          v-for="group in groupedPermissions"
          :key="group.module"
          :title="`${group.label} (${group.selectedCount})`"
        )
          dd-stack(compact)
            dd-checkbox(
              v-for="permission in group.permissions"
              :key="permission.id"
              :model-value="selectedPermissionKeys.includes(permission.key)"
              @update:model-value="togglePermission(permission.key, Boolean($event))"
            ) {{ formatPermissionLabel(permission) }}
</template>
