<script setup lang="ts">
import { AuthRolesModule } from '~/api/auth'
import type { AppTableColumn } from '~/types/backoffice'
import type { AuthUserRecord, UserAccessFormValues } from '~/types/auth'
import { useAuthUsersStore } from '~~/stores/useAuthUsersStore'

const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const usersStore = useAuthUsersStore()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('usuarios')
const requestError = ref('')
const modalOpen = ref(false)
const modalLoading = ref(false)
const editingUser = ref<AuthUserRecord | null>(null)
const form = ref<UserAccessFormValues>({
  internalRoleId: '',
  isActive: true,
})
const roleOptions = ref<Array<{ label: string; value: string }>>([])
const workspaceRoleLabelMap = new Map([
  ['ADMIN', 'Admin'],
  ['MANAGER', 'Gestor'],
  ['TEACHER', 'Professor'],
  ['STAFF', 'Staff'],
])

const columns: AppTableColumn[] = [
  { key: 'name', title: 'Usuário' },
  { key: 'email', title: 'E-mail' },
  { key: 'googleWorkspaceRole', title: 'Workspace' },
  { key: 'internalRoleName', title: 'Papel interno' },
  { key: 'isActive', title: 'Status' },
  { key: 'actions', title: 'Ações', width: '64px', align: 'right' },
]

watch(() => [
  usersStore.filters.search,
  usersStore.filters.page,
  usersStore.filters.pageSize,
] as const, async () => {
  await usersStore.fetch()
}, { immediate: true })

onMounted(() => {
  void fetchRoleOptions()
})

// Debounce search input to prevent excessive API calls while typing
const handleSearch = useDebounceFn((value: string) => {
  usersStore.setFilters({
    search: value,
    page: 1,
  })
}, 300)

async function fetchRoleOptions() {
  if (roleOptions.value.length) {
    return
  }

  const response = await AuthRolesModule.list({
    search: '',
    page: 1,
    pageSize: 200,
  })

  roleOptions.value = response.items.map(role => ({
    label: role.name,
    value: role.id,
  }))
}

async function openEditModal(user: AuthUserRecord) {
  editingUser.value = user
  form.value = {
    internalRoleId: user.internalRoleId ?? '',
    isActive: user.isActive,
  }
  requestError.value = ''
  modalOpen.value = true
  modalLoading.value = true

  try {
    await fetchRoleOptions()
  } finally {
    modalLoading.value = false
  }
}

async function handleSave() {
  if (!editingUser.value) {
    return
  }

  requestError.value = ''

  try {
    await usersStore.updateItem(editingUser.value.id, {
      internalRoleId: form.value.internalRoleId || null,
      isActive: form.value.isActive,
    })

    showToast('Acesso do usuário atualizado com sucesso.', {
      title: 'Usuários',
      type: 'success',
    })

    modalOpen.value = false
  } catch (error) {
    requestError.value = getErrorMessage(error, 'Não foi possível atualizar o acesso do usuário.')
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('usuarios')"
    :title="meta.title"
    :description="meta.description"
  )

  backoffice-list-panel(
    :columns="columns"
    :data="usersStore.data"
    :loading="usersStore.loading"
    :is-invalid="Boolean(usersStore.error)"
    :error-message="usersStore.error?.message ?? ''"
    :page="usersStore.filters.page"
    :total="usersStore.total"
    :page-size="usersStore.filters.pageSize"
    @update:page="usersStore.setFilters({ page: $event })"
    @update:page-size="usersStore.setFilters({ pageSize: $event, page: 1 })"
  )
    template(#toolbar)
      dd-input(
        :model-value="usersStore.filters.search"
        icon="lucide:search"
        placeholder="Buscar usuário"
        @update:model-value="handleSearch"
      )

    template(#cell-name="{ row }")
      strong {{ row.name }}

    template(#cell-googleWorkspaceRole="{ row }")
      span {{ workspaceRoleLabelMap.get(row.googleWorkspaceRole) ?? row.googleWorkspaceRole }}

    template(#cell-internalRoleName="{ row }")
      span {{ row.internalRoleName ?? 'Sem papel' }}

    template(#cell-isActive="{ row }")
      dd-badge(:color="row.isActive ? 'success' : 'danger'") {{ row.isActive ? 'Ativo' : 'Inativo' }}

    template(#cell-actions="{ row }")
      backoffice-row-actions(
        :show-delete="false"
        edit-label="Editar acesso"
        @edit="openEditModal(row)"
      )

  backoffice-user-access-modal-form(
    v-if="modalOpen"
    :open="modalOpen"
    :title="editingUser ? 'Editar acesso do usuário' : 'Gerenciar acesso'"
    :model-value="form"
    :role-options="roleOptions"
    :user-name="editingUser?.name ?? ''"
    :user-email="editingUser?.email ?? ''"
    :google-workspace-role="editingUser?.googleWorkspaceRole ?? 'STAFF'"
    :is-workspace-admin="Boolean(editingUser?.isWorkspaceAdmin)"
    :loading="modalLoading || usersStore.loading"
    :error-message="requestError"
    @update:open="modalOpen = $event"
    @update:model-value="form = $event"
    @save="handleSave"
  )
</template>
