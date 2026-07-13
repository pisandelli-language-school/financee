<script setup lang="ts">
import { AuthPermissionsModule } from '~/api/auth'
import type { AppTableColumn } from '~/types/backoffice'
import type {
  AuthRoleRecord,
  PermissionCatalogRecord,
  RolePermissionsFormValues,
} from '~/types/auth'
import { usePermissionsStore } from '~~/stores/usePermissionsStore'

const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const permissionsStore = usePermissionsStore()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('permissoes')
const requestError = ref('')
const modalOpen = ref(false)
const editingRole = ref<AuthRoleRecord | null>(null)
const form = ref<RolePermissionsFormValues>({
  permissionKeys: [],
})
const permissionCatalog = ref<PermissionCatalogRecord[]>([])

const columns: AppTableColumn[] = [
  { key: 'name', title: 'Papel' },
  { key: 'description', title: 'Descrição' },
  { key: 'usersCount', title: 'Usuários', align: 'center' },
  { key: 'permissions', title: 'Permissões' },
  { key: 'actions', title: 'Ações', width: '64px', align: 'right' },
]

watch(() => [
  permissionsStore.filters.search,
  permissionsStore.filters.page,
  permissionsStore.filters.pageSize,
] as const, async () => {
  await permissionsStore.fetch()
}, { immediate: true })

function handleSearch(value: string) {
  permissionsStore.setFilters({
    search: value,
    page: 1,
  })
}

async function fetchPermissionCatalog() {
  if (permissionCatalog.value.length) {
    return
  }

  permissionCatalog.value = await AuthPermissionsModule.list()
}

async function openEditModal(role: AuthRoleRecord) {
  editingRole.value = role
  form.value = {
    permissionKeys: [...role.permissions],
  }
  requestError.value = ''
  await fetchPermissionCatalog()
  modalOpen.value = true
}

async function handleSave() {
  if (!editingRole.value) {
    return
  }

  requestError.value = ''

  try {
    await permissionsStore.updateItem(editingRole.value.id, {
      permissionKeys: form.value.permissionKeys,
    })

    showToast('Permissões atualizadas com sucesso.', {
      title: 'Permissões',
      type: 'success',
    })

    modalOpen.value = false
  } catch (error) {
    requestError.value = getErrorMessage(error, 'Não foi possível atualizar as permissões.')
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('permissoes')"
    :title="meta.title"
    :description="meta.description"
  )

  backoffice-list-panel(
    :columns="columns"
    :data="permissionsStore.data"
    :loading="permissionsStore.loading"
    :is-invalid="Boolean(permissionsStore.error)"
    :error-message="permissionsStore.error?.message ?? ''"
    :page="permissionsStore.filters.page"
    :total="permissionsStore.total"
    :page-size="permissionsStore.filters.pageSize"
    @update:page="permissionsStore.setFilters({ page: $event })"
    @update:page-size="permissionsStore.setFilters({ pageSize: $event, page: 1 })"
  )
    template(#toolbar)
      dd-input(
        :model-value="permissionsStore.filters.search"
        icon="lucide:search"
        placeholder="Buscar papel"
        @update:model-value="handleSearch"
      )

    template(#cell-name="{ row }")
      dd-cluster(compact)
        strong {{ row.name }}
        dd-badge(v-if="row.isSystem" info) Sistema

    template(#cell-usersCount="{ row }")
      span {{ row.usersCount }}

    template(#cell-permissions="{ row }")
      span {{ row.permissions.length }} permissões

    template(#cell-actions="{ row }")
      backoffice-row-actions(
        :show-delete="false"
        edit-label="Editar permissões"
        @edit="openEditModal(row)"
      )

  backoffice-role-permissions-modal-form(
    v-if="modalOpen"
    :open="modalOpen"
    :title="editingRole ? `Permissões de ${editingRole.name}` : 'Editar permissões'"
    :role-name="editingRole?.name ?? ''"
    :model-value="form"
    :permissions="permissionCatalog"
    :loading="permissionsStore.loading"
    :error-message="requestError"
    @update:open="modalOpen = $event"
    @update:model-value="form = $event"
    @save="handleSave"
  )
</template>
