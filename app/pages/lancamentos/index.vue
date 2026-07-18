<script setup lang="ts">
import { AccountModule, CategoryModule, ContactModule } from '~/api/backoffice'
import { FinancialEntriesModule } from '~/api/financial'
import type { AppTableColumn } from '~/types/backoffice'
import {
  entryDirectionOptions,
  entryStatusOptions,
  type EntryDirection,
  type FinancialEntryRecord,
  type RecurrenceEditScope,
} from '~/types/financial'
import { useFinancialEntriesStore } from '~~/stores/useFinancialEntriesStore'

const entriesStore = useFinancialEntriesStore()
const fin = useCssModule('fin')
const currentAuth = useState('auth:current-user', () => null as null | { permissions: string[] })
const canCreateEntries = computed(() => currentAuth.value?.permissions?.includes('lancamentos.create') ?? false)
const canUpdateEntries = computed(() => currentAuth.value?.permissions?.includes('lancamentos.update') ?? false)
const canPayEntries = computed(() => currentAuth.value?.permissions?.includes('lancamentos.pay') ?? false)
const canCancelEntries = computed(() => currentAuth.value?.permissions?.includes('lancamentos.cancel') ?? false)
const canDeleteEntries = computed(() => currentAuth.value?.permissions?.includes('lancamentos.delete') ?? false)
const { showToast } = useToaster()
const { getErrorMessage } = useBackofficeApiFeedback()

const pageMeta = {
  title: 'Lançamentos',
  description: 'Consulte entradas e saídas com visão mensal, filtros compactos e leitura rápida do status operacional.',
}

const breadcrumb = {
  routes: [{ label: 'Lançamentos' }],
}

const currentMonth = ref(startOfMonth(new Date()))
const categoryOptions = ref<Array<{ label: string; value: string }>>([])
const accountOptions = ref<Array<{ label: string; value: string }>>([])
const contactOptions = ref<Array<{ label: string; value: string }>>([])
const createModalOpen = ref(false)
const editingEntry = ref<FinancialEntryRecord | null>(null)
const paymentModalOpen = ref(false)
const paymentTarget = ref<FinancialEntryRecord | null>(null)
const statusActionLoading = ref('')

const columns: AppTableColumn[] = [
  { key: 'description', title: 'Descrição' },
  { key: 'direction', title: 'Direção', width: '120px' },
  { key: 'categoryName', title: 'Categoria' },
  { key: 'accountName', title: 'Conta' },
  { key: 'contactName', title: 'Contato' },
  { key: 'effectiveDueDate', title: 'Vencimento', width: '140px' },
  { key: 'amount', title: 'Valor', align: 'right', width: '160px' },
  { key: 'status', title: 'Status', width: '160px' },
  { key: 'actions', title: 'Ações', width: '96px', align: 'right' },
]

syncMonthFilters(currentMonth.value)

await Promise.all([
  loadFilterOptions(),
  entriesStore.fetch(),
])

watch(() => [
  entriesStore.filters.search,
  entriesStore.filters.direction,
  entriesStore.filters.status,
  entriesStore.filters.accountId,
  entriesStore.filters.categoryId,
  entriesStore.filters.contactId,
  entriesStore.filters.dateFrom,
  entriesStore.filters.dateTo,
  entriesStore.filters.page,
  entriesStore.filters.pageSize,
] as const, async () => {
  await entriesStore.fetch()
})

const periodLabel = computed(() => capitalizeMonthLabel(
  new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(currentMonth.value),
))

const activeFilterCount = computed(() => [
  entriesStore.filters.direction,
  entriesStore.filters.status,
  entriesStore.filters.accountId,
  entriesStore.filters.categoryId,
  entriesStore.filters.contactId,
].filter(Boolean).length)

const summaryCards = computed(() => {
  const income = entriesStore.data
    .filter(item => item.direction === 'INCOME')
    .reduce((total, item) => total + item.amount, 0)
  const expense = entriesStore.data
    .filter(item => item.direction === 'EXPENSE')
    .reduce((total, item) => total + item.amount, 0)
  const net = income - expense

  return [
    {
      key: 'all',
      label: 'Todos',
      value: formatCurrency(net),
      tone: 'neutral' as const,
      active: !entriesStore.filters.direction,
      onClick: () => setDirectionCard(''),
    },
    {
      key: 'expense',
      label: 'Saídas',
      value: formatCurrency(-expense),
      tone: 'expense' as const,
      active: entriesStore.filters.direction === 'EXPENSE',
      onClick: () => setDirectionCard('EXPENSE'),
    },
    {
      key: 'income',
      label: 'Entradas',
      value: formatCurrency(income),
      tone: 'income' as const,
      active: entriesStore.filters.direction === 'INCOME',
      onClick: () => setDirectionCard('INCOME'),
    },
  ]
})

async function loadFilterOptions() {
  const [categoriesResponse, accountsResponse, contactsResponse] = await Promise.all([
    CategoryModule.list({
      search: '',
      type: '',
      page: 1,
      pageSize: 200,
    }),
    AccountModule.list({
      search: '',
      page: 1,
      pageSize: 200,
    }),
    ContactModule.list({
      search: '',
      nature: '',
      role: '',
      page: 1,
      pageSize: 200,
    }),
  ])

  categoryOptions.value = categoriesResponse.items
    .filter(item => item.isActive)
    .map(item => ({
      label: item.parentName ? `${item.parentName} / ${item.name}` : item.name,
      value: item.id,
    }))

  accountOptions.value = accountsResponse.items
    .filter(item => item.isActive)
    .map(item => ({
      label: item.name,
      value: item.id,
    }))

  contactOptions.value = contactsResponse.items
    .filter(item => item.isActive)
    .map(item => ({
      label: item.name,
      value: item.id,
    }))
}

function handleSearch(value: string) {
  entriesStore.setFilters({
    search: value,
    page: 1,
  })
}

function setDirection(value: string) {
  entriesStore.setFilters({
    direction: value as typeof entriesStore.filters.direction,
    page: 1,
  })
}

function setDirectionCard(value: EntryDirection | '') {
  setDirection(entriesStore.filters.direction === value ? '' : value)
}

function setStatus(value: string) {
  entriesStore.setFilters({
    status: value as typeof entriesStore.filters.status,
    page: 1,
  })
}

function setAccount(value: string) {
  entriesStore.setFilters({
    accountId: value,
    page: 1,
  })
}

function setCategory(value: string) {
  entriesStore.setFilters({
    categoryId: value,
    page: 1,
  })
}

function setContact(value: string) {
  entriesStore.setFilters({
    contactId: value,
    page: 1,
  })
}

function clearSecondaryFilters(event?: MouseEvent) {
  entriesStore.setFilters({
    direction: '',
    status: '',
    accountId: '',
    categoryId: '',
    contactId: '',
    page: 1,
  })

  closePopover(event)
}

function openCreateEntry() {
  editingEntry.value = null
  createModalOpen.value = true
}

function openEditEntry(entry: FinancialEntryRecord) {
  editingEntry.value = entry
  createModalOpen.value = true
}

function openPaymentModal(entry: FinancialEntryRecord) {
  paymentTarget.value = entry
  paymentModalOpen.value = true
}

function openEntryDetails(id: string) {
  void navigateTo(`/lancamentos/${id}`)
}

async function handleEntrySaved() {
  entriesStore.setFilters({ page: 1 })
  await entriesStore.fetch()
}

async function handlePaymentSaved() {
  await entriesStore.fetch()
}

async function reopenEntry(entry: FinancialEntryRecord) {
  if (!window.confirm(`Deseja reabrir o lançamento "${entry.description}"?`)) {
    return
  }

  await runStatusAction(entry.id, async () => {
    await FinancialEntriesModule.markAsOpen(entry.id)
    showToast('Lançamento reaberto.', {
      title: 'Lançamentos',
      type: 'success',
    })
  })
}

async function cancelEntry(entry: FinancialEntryRecord) {
  const scope = getRecurrenceScope(entry, 'cancelar')

  if (!scope) {
    return
  }

  await runStatusAction(entry.id, async () => {
    await FinancialEntriesModule.cancel(entry.id, { scope })
    showToast('Lançamento cancelado.', {
      title: 'Lançamentos',
      type: 'success',
    })
  })
}

function getRecurrenceScope(entry: FinancialEntryRecord, actionLabel: string): RecurrenceEditScope | null {
  if (!entry.recurrenceGroupId) {
    return window.confirm(`Deseja ${actionLabel} o lançamento "${entry.description}"?`)
      ? 'ONLY_THIS'
      : null
  }

  const selectedOption = window.prompt(
    [
      `Este lançamento faz parte de uma série. Como deseja ${actionLabel}?`,
      '',
      '1 - Apenas este lançamento',
      '2 - Este e os próximos',
      '3 - Todos da série',
    ].join('\n'),
    '1',
  )

  if (selectedOption === null) {
    return null
  }

  if (selectedOption.trim() === '2') {
    return 'THIS_AND_NEXT'
  }

  if (selectedOption.trim() === '3') {
    return 'ALL'
  }

  return selectedOption.trim() === '1' || selectedOption.trim() === ''
    ? 'ONLY_THIS'
    : null
}

async function deleteEntry(entry: FinancialEntryRecord) {
  if (!window.confirm(`Deseja excluir o lançamento "${entry.description}"? Esta ação remove o registro da listagem, mas não deve ser usada para baixa financeira.`)) {
    return
  }

  await runStatusAction(entry.id, async () => {
    await FinancialEntriesModule.delete(entry.id)
    showToast('Lançamento excluído.', {
      title: 'Lançamentos',
      type: 'success',
    })
  })
}

async function runStatusAction(id: string, action: () => Promise<void>) {
  statusActionLoading.value = id

  try {
    await action()
    await entriesStore.fetch()
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível atualizar o lançamento.'), {
      title: 'Lançamentos',
      type: 'error',
    })
  } finally {
    statusActionLoading.value = ''
  }
}

function goToPreviousMonth() {
  currentMonth.value = shiftMonth(currentMonth.value, -1)
  syncMonthFilters(currentMonth.value)
}

function goToNextMonth() {
  currentMonth.value = shiftMonth(currentMonth.value, 1)
  syncMonthFilters(currentMonth.value)
}

function syncMonthFilters(value: Date) {
  entriesStore.setFilters({
    dateFrom: toDateInput(startOfMonth(value)),
    dateTo: toDateInput(endOfMonth(value)),
    page: 1,
  })
}

function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

function endOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0))
}

function shiftMonth(value: Date, amount: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1))
}

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10)
}

function capitalizeMonthLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function closePopover(event?: MouseEvent) {
  const popover = event?.currentTarget instanceof HTMLElement
    ? event.currentTarget.closest('[popover]')
    : null

  if (popover instanceof HTMLElement && 'hidePopover' in popover) {
    ;(popover as HTMLElement & { hidePopover: () => void }).hidePopover()
  }
}

function getSummaryCardClass(card: {
  active: boolean
  tone: 'neutral' | 'income' | 'expense'
}) {
  return [
    fin.summaryCard,
    card.active && fin.summaryCardActive,
    card.tone === 'income' && fin.summaryIncome,
    card.tone === 'expense' && fin.summaryExpense,
  ]
}

function getStatusSurfaceClass(status: FinancialEntryRecord['status']) {
  return [
    fin.statusSurface,
    status === 'OPEN' && fin.statusSurfaceOpen,
  ]
}

function statusColor(status: FinancialEntryRecord['status']) {
  if (status === 'PAID') {
    return 'success'
  }

  if (status === 'CANCELED') {
    return 'danger'
  }

  return 'warning'
}

function directionLabel(direction: FinancialEntryRecord['direction']) {
  return direction === 'INCOME' ? 'Entrada' : 'Saída'
}

function directionColor(direction: FinancialEntryRecord['direction']) {
  return direction === 'INCOME' ? 'success' : 'danger'
}

function statusLabel(status: FinancialEntryRecord['status']) {
  return entryStatusOptions.find(option => option.value === status)?.label ?? status
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(new Date(`${value}T00:00:00.000Z`))
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="breadcrumb"
    :title="pageMeta.title"
    :description="pageMeta.description"
  )

  backoffice-list-panel(
    :columns="columns"
    :data="entriesStore.data"
    :loading="entriesStore.loading"
    :is-invalid="Boolean(entriesStore.error)"
    :error-message="entriesStore.error?.message ?? ''"
    :page="entriesStore.filters.page"
    :total="entriesStore.total"
    :page-size="entriesStore.filters.pageSize"
    @update:page="entriesStore.setFilters({ page: $event })"
    @update:page-size="entriesStore.setFilters({ pageSize: $event, page: 1 })"
  )
    template(#notice)
      dd-stack(compact)
        dd-grid(:class="fin.topControls")
          dd-cluster(compact :class="fin.toolbarStart")
            dd-popover(trigger="click" placement="bottom-start")
              dd-button(
                outline
                small
                icon="lucide:filter"
                type="button"
              ) {{ activeFilterCount ? `Filtrar (${activeFilterCount})` : 'Filtrar' }}

              template(#content)
                dd-stack(:class="fin.filterPopover")
                  dd-stack(compact nogap)
                    strong Filtros
                    span(:class="fin.filterHint") Refine a visão atual do mês.

                  dd-grid(:class="fin.filterGrid")
                    dd-select(
                      :model-value="entriesStore.filters.direction"
                      :options="[...entryDirectionOptions]"
                      placeholder="Todas as direções"
                      @update:model-value="setDirection(String($event ?? ''))"
                    )
                    dd-select(
                      :model-value="entriesStore.filters.status"
                      :options="[...entryStatusOptions]"
                      placeholder="Todos os status"
                      @update:model-value="setStatus(String($event ?? ''))"
                    )
                    dd-select(
                      :model-value="entriesStore.filters.accountId"
                      :options="accountOptions"
                      placeholder="Todas as contas"
                      @update:model-value="setAccount(String($event ?? ''))"
                    )
                    dd-select(
                      :model-value="entriesStore.filters.categoryId"
                      :options="categoryOptions"
                      placeholder="Todas as categorias"
                      @update:model-value="setCategory(String($event ?? ''))"
                    )
                    dd-select(
                      :model-value="entriesStore.filters.contactId"
                      :options="contactOptions"
                      placeholder="Todos os contatos"
                      @update:model-value="setContact(String($event ?? ''))"
                    )

                  dd-cluster(end)
                    dd-button(
                      ghost
                      small
                      type="button"
                      @click="clearSecondaryFilters($event)"
                    ) Limpar filtros

            dd-input(
              :class="fin.searchField"
              no-message
              :model-value="entriesStore.filters.search"
              icon="lucide:search"
              placeholder="Buscar lançamento"
              @update:model-value="handleSearch"
            )

          dd-cluster(compact :class="fin.periodNav")
            dd-button(
              outline
              small
              icon-only
              icon="lucide:chevron-left"
              type="button"
              aria-label="Mês anterior"
              @click="goToPreviousMonth"
            )
            dd-button(
              outline
              small
              type="button"
              :class="fin.periodButton"
            ) {{ periodLabel }}
            dd-button(
              outline
              small
              icon-only
              icon="lucide:chevron-right"
              type="button"
              aria-label="Próximo mês"
              @click="goToNextMonth"
            )

          dd-cluster(end :class="fin.toolbarEnd")
            dd-button(
              v-if="canCreateEntries"
              primary
              icon="lucide:plus"
              type="button"
              @click="openCreateEntry"
            ) Novo lançamento

        dd-grid(:class="fin.summaryGrid")
          dd-card(
            v-for="card in summaryCards"
            :key="card.key"
            tag="button"
            type="button"
            :class="getSummaryCardClass(card)"
            @click="card.onClick()"
          )
            dd-stack(compact nogap)
              span(:class="fin.summaryLabel") {{ card.label }}
              strong(:class="fin.summaryValue") {{ card.value }}

    template(#empty)
      backoffice-empty-state(
        title="Nenhum lançamento encontrado"
        message="Ajuste os filtros deste período ou cadastre o primeiro lançamento para começar."
      )

    template(#cell-description="{ row }")
      dd-stack(compact nogap)
        strong {{ row.description }}
        span(v-if="row.notes" :class="fin.notes") {{ row.notes }}

    template(#cell-direction="{ row }")
      dd-badge(:color="directionColor(row.direction)") {{ directionLabel(row.direction) }}

    template(#cell-categoryName="{ row }")
      span {{ row.subcategoryName ? `${row.categoryName} / ${row.subcategoryName}` : row.categoryName ?? '-' }}

    template(#cell-contactName="{ row }")
      span {{ row.contactName ?? '-' }}

    template(#cell-effectiveDueDate="{ row }")
      span {{ formatDate(row.effectiveDueDate) }}

    template(#cell-amount="{ row }")
      strong(:class="row.direction === 'INCOME' ? fin.amountIncome : fin.amountExpense") {{ formatCurrency(row.amount) }}

    template(#cell-status="{ row }")
      span(:class="getStatusSurfaceClass(row.status)")
        dd-badge(:color="statusColor(row.status)") {{ statusLabel(row.status) }}

    template(#cell-actions="{ row }")
      dd-cluster(compact end)
        dd-button(
          v-if="canPayEntries && row.status === 'OPEN' && row.type !== 'TRANSFER'"
          ghost
          tiny
          icon-only
          success
          type="button"
          icon="lucide:check"
          aria-label="Marcar como pago"
          :disabled="statusActionLoading === row.id"
          @click="openPaymentModal(row)"
        )
        dd-button(
          v-if="canPayEntries && row.status === 'PAID' && row.type !== 'TRANSFER'"
          ghost
          tiny
          icon-only
          warning
          type="button"
          icon="lucide:rotate-ccw"
          aria-label="Reabrir lançamento"
          :disabled="statusActionLoading === row.id"
          @click="reopenEntry(row)"
        )
        dd-button(
          v-if="canUpdateEntries && row.type !== 'TRANSFER'"
          ghost
          tiny
          icon-only
          info
          type="button"
          icon="lucide:pencil"
          aria-label="Editar lançamento"
          :disabled="row.status === 'CANCELED' || statusActionLoading === row.id"
          @click="openEditEntry(row)"
        )
        dd-button(
          v-if="canCancelEntries && row.status !== 'CANCELED' && row.type !== 'TRANSFER'"
          ghost
          tiny
          icon-only
          danger
          type="button"
          icon="lucide:x"
          aria-label="Cancelar lançamento"
          :disabled="statusActionLoading === row.id"
          @click="cancelEntry(row)"
        )
        dd-button(
          v-if="canDeleteEntries && row.status === 'OPEN' && row.type !== 'TRANSFER' && !row.paymentDate && !row.recurrenceGroupId"
          ghost
          tiny
          icon-only
          danger
          type="button"
          icon="lucide:trash-2"
          aria-label="Excluir lançamento"
          :disabled="statusActionLoading === row.id"
          @click="deleteEntry(row)"
        )
        dd-button(
          ghost
          tiny
          icon-only
          info
          type="button"
          icon="lucide:eye"
          aria-label="Ver lançamento"
          @click="openEntryDetails(row.id)"
        )

  backoffice-financial-entry-modal-form(
    v-model:open="createModalOpen"
    :entry="editingEntry"
    @saved="handleEntrySaved"
  )

  backoffice-financial-entry-payment-modal-form(
    v-model:open="paymentModalOpen"
    :entry="paymentTarget"
    :account-options="accountOptions"
    @saved="handlePaymentSaved"
  )
</template>

<style module="fin">
.topControls {
  align-items: center;
  display: grid;
  gap: v('space.sm');
  grid-template-columns: 1fr auto 1fr;
}

.toolbarStart {
  align-items: center;
  flex-wrap: wrap;
  gap: v('space.sm');
}

.toolbarEnd {
  align-items: center;
  justify-self: end;
}

.searchField {
  flex: 1 1 18rem;
  min-inline-size: 16rem;
}

.periodNav {
  align-items: center;
  justify-self: center;
}

.periodButton {
  min-inline-size: 12rem;
}

.filterPopover {
  inline-size: min(28rem, calc(100vw - 3rem));
}

.filterHint {
  color: v('color.text.soft');
  font-size: v('font-size.sm');
}

.filterGrid {
  --dd-grid-column-min-width: 12rem;
}

.summaryGrid {
  --dd-grid-column-min-width: 14rem;
  --dd-grid-gap: v('space.sm');
}

.summaryCard {
  cursor: pointer;
  inline-size: 100%;
  text-align: left;
  transition: box-shadow .18s ease, border-color .18s ease, transform .18s ease;
}

.summaryCard:hover {
  transform: translateY(-1px);
}

.summaryCardActive {
  box-shadow: 0 0 0 1px v('color.primary');
}

.summaryLabel {
  color: v('color.text.soft');
  font-size: v('font-size.sm');
}

.summaryValue {
  color: v('color.text');
  font-size: v('font-size.xl');
  line-height: v('line-height.tight');
}

.summaryIncome .summaryValue {
  color: v('color.success.700');
}

.summaryExpense .summaryValue {
  color: v('color.danger.700');
}

.notes {
  color: v('color.text.soft');
  font-size: v('font-size.xs');
}

.amountIncome {
  color: v('color.success.700');
}

.amountExpense {
  color: v('color.danger.700');
}

.statusSurface {
  background: v('color.bg.surface');
  border-radius: v('border-radius.sm');
  display: inline-flex;
  inline-size: 100%;
  justify-content: flex-start;
  min-block-size: 2.5rem;
  padding-block: v('space.xxs');
  padding-inline: v('space.xs');
}

.statusSurfaceOpen {
  background: v('color.warning.50');
}
</style>
