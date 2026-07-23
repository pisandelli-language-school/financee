<script setup lang="ts">
import { AccountModule, CategoryModule, ContactModule, PaymentMethodModule, TagModule } from '~/api/backoffice'
import { FinancialEntriesModule } from '~/api/financial'
import type { AppTableColumn } from '~/types/backoffice'
import { getAccountInitials, getInstitutionLogoByKey } from '~/utils/account-institutions'
import {
  entryDirectionOptions,
  entryStatusOptions,
  type EntryDirection,
  type FinancialEntryFilters,
  type FinancialEntryRecord,
  type FinancialEntrySummary,
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

const categoryOptions = ref<Array<{ label: string; value: string }>>([])
const accountOptions = ref<Array<{ label: string; value: string }>>([])
const contactOptions = ref<Array<{ label: string; value: string }>>([])
const paymentMethodOptions = ref<Array<{ label: string; value: string }>>([])
const tagOptions = ref<Array<{ label: string; value: string }>>([])
const createModalOpen = ref(false)
const editingEntry = ref<FinancialEntryRecord | null>(null)
const paymentModalOpen = ref(false)
const paymentTarget = ref<FinancialEntryRecord | null>(null)
const detailsModalOpen = ref(false)
const detailsEntry = ref<FinancialEntryRecord | null>(null)
const actionModalOpen = ref(false)
const actionTarget = ref<FinancialEntryRecord | null>(null)
const actionKind = ref<'reopen' | 'cancel' | 'delete' | null>(null)
const statusActionLoading = ref('')
const currentSummary = ref<FinancialEntrySummary>(createEmptySummary())
const previousSummary = ref<FinancialEntrySummary>(createEmptySummary())

const columns: AppTableColumn[] = [
  { key: 'direction', title: 'Direção', width: '80px', align: 'center' },
  { key: 'effectiveDueDate', title: 'Vencimento', width: '120px' },
  { key: 'description', title: 'Descrição' },
  { key: 'contactName', title: 'Contato' },
  { key: 'accountName', title: 'Conta', width: '5rem', align: 'center' },
  { key: 'categoryName', title: 'Categoria' },
  { key: 'amount', title: 'Valor', width: '7rem' },
  { key: 'status', title: 'Status', width: '5rem', align: 'center' },
  { key: 'actions', title: 'Ações', width: '5rem', align: 'center' },
]

syncMonthFilters(startOfMonth(new Date()))

await Promise.all([
  loadFilterOptions(),
  entriesStore.fetch(),
  loadSummaryComparisons(),
])

watch(() => [
  entriesStore.filters.search,
  entriesStore.filters.direction,
  entriesStore.filters.status,
  entriesStore.filters.accountId,
  entriesStore.filters.paymentMethodId,
  entriesStore.filters.categoryId,
  entriesStore.filters.contactId,
  entriesStore.filters.tagId,
  entriesStore.filters.dateFrom,
  entriesStore.filters.dateTo,
  entriesStore.filters.page,
  entriesStore.filters.pageSize,
] as const, async () => {
  await Promise.all([
    entriesStore.fetch(),
    loadSummaryComparisons(),
  ])
})

const visibleMonth = computed(() => parseDateInput(entriesStore.filters.dateFrom) ?? startOfMonth(new Date()))

const periodLabel = computed(() => capitalizeMonthLabel(
  new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(visibleMonth.value),
))

const activeFilterCount = computed(() => [
  entriesStore.filters.direction,
  entriesStore.filters.status,
  entriesStore.filters.accountId,
  entriesStore.filters.paymentMethodId,
  entriesStore.filters.categoryId,
  entriesStore.filters.contactId,
  entriesStore.filters.tagId,
].filter(Boolean).length)

const summaryCards = computed(() => {
  return [
    {
      key: 'income',
      label: 'Entradas',
      value: formatCurrency(currentSummary.value.income),
      tone: 'income' as const,
      active: entriesStore.filters.direction === 'INCOME',
      trend: getSummaryTrend(currentSummary.value.income, previousSummary.value.income, 'income'),
      onClick: () => setDirectionCard('INCOME'),
    },
    {
      key: 'expense',
      label: 'Saídas',
      value: formatCurrency(-currentSummary.value.expense),
      tone: 'expense' as const,
      active: entriesStore.filters.direction === 'EXPENSE',
      trend: getSummaryTrend(currentSummary.value.expense, previousSummary.value.expense, 'expense'),
      onClick: () => setDirectionCard('EXPENSE'),
    },
    {
      key: 'all',
      label: 'Total',
      value: formatCurrency(currentSummary.value.net),
      tone: 'total' as const,
      active: !entriesStore.filters.direction,
      trend: getSummaryTrend(currentSummary.value.net, previousSummary.value.net, 'total'),
      onClick: () => setDirectionCard(''),
    },
  ]
})

async function loadSummaryComparisons() {
  const month = parseDateInput(entriesStore.filters.dateFrom) ?? startOfMonth(new Date())
  const currentFilters = getSummaryFilters(month)
  const previousFilters = getSummaryFilters(shiftMonth(month, -1))

  const [current, previous] = await Promise.all([
    FinancialEntriesModule.summary(currentFilters),
    FinancialEntriesModule.summary(previousFilters),
  ])

  currentSummary.value = current
  previousSummary.value = previous
}

async function loadFilterOptions() {
  const [categoriesResponse, accountsResponse, contactsResponse, paymentMethodsResponse, tagsResponse] = await Promise.all([
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
    PaymentMethodModule.list({
      search: '',
      page: 1,
      pageSize: 200,
    }),
    TagModule.list({
      search: '',
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

  paymentMethodOptions.value = paymentMethodsResponse.items
    .filter(item => item.isActive)
    .map(item => ({
      label: item.name,
      value: item.id,
    }))

  tagOptions.value = tagsResponse.items
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

function setPaymentMethod(value: string) {
  entriesStore.setFilters({
    paymentMethodId: value,
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

function setTag(value: string) {
  entriesStore.setFilters({
    tagId: value,
    page: 1,
  })
}

function clearSecondaryFilters(event?: MouseEvent) {
  entriesStore.setFilters({
    direction: '',
    status: '',
    accountId: '',
    paymentMethodId: '',
    categoryId: '',
    contactId: '',
    tagId: '',
    page: 1,
  })

  closePopover(event)
}

function runActionFromMenu(action: () => void | Promise<void>, event?: MouseEvent) {
  closePopover(event)
  void action()
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

function openEntryDetails(entry: FinancialEntryRecord) {
  detailsEntry.value = entry
  detailsModalOpen.value = true
}

async function handleEntrySaved() {
  entriesStore.setFilters({ page: 1 })
  await entriesStore.fetch()
}

async function handlePaymentSaved() {
  await entriesStore.fetch()
}

function askReopenEntry(entry: FinancialEntryRecord) {
  openActionModal('reopen', entry)
}

function askCancelEntry(entry: FinancialEntryRecord) {
  openActionModal('cancel', entry)
}

function askDeleteEntry(entry: FinancialEntryRecord) {
  openActionModal('delete', entry)
}

function openActionModal(kind: 'reopen' | 'cancel' | 'delete', entry: FinancialEntryRecord) {
  actionKind.value = kind
  actionTarget.value = entry
  actionModalOpen.value = true
}

async function confirmEntryAction(scope: RecurrenceEditScope) {
  if (!actionTarget.value || !actionKind.value) {
    return
  }

  const entry = actionTarget.value
  const kind = actionKind.value

  await runStatusAction(entry.id, async () => {
    if (kind === 'reopen') {
      await FinancialEntriesModule.markAsOpen(entry.id)
      showToast('Lançamento reaberto.', {
        title: 'Lançamentos',
        type: 'success',
      })
      return
    }

    if (kind === 'cancel') {
      await FinancialEntriesModule.cancel(entry.id, { scope })
      showToast('Lançamento cancelado.', {
        title: 'Lançamentos',
        type: 'success',
      })
      return
    }

    await FinancialEntriesModule.delete(entry.id)
    showToast('Lançamento excluído.', {
      title: 'Lançamentos',
      type: 'success',
    })
  })

  actionModalOpen.value = false
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
  syncMonthFilters(shiftMonth(visibleMonth.value, -1))
}

function goToNextMonth() {
  syncMonthFilters(shiftMonth(visibleMonth.value, 1))
}

function syncMonthFilters(value: Date) {
  entriesStore.setFilters({
    dateFrom: toDateInput(startOfMonth(value)),
    dateTo: toDateInput(endOfMonth(value)),
    page: 1,
  })
}

function getSummaryFilters(value: Date): FinancialEntryFilters {
  return {
    ...entriesStore.filters,
    direction: '',
    dateFrom: toDateInput(startOfMonth(value)),
    dateTo: toDateInput(endOfMonth(value)),
    page: 1,
    pageSize: 0,
  }
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

function parseDateInput(value: string) {
  if (!value) {
    return null
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.valueOf()) ? null : startOfMonth(parsed)
}

function capitalizeMonthLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function createEmptySummary(): FinancialEntrySummary {
  return {
    income: 0,
    expense: 0,
    net: 0,
  }
}

function getSummaryTrend(
  current: number,
  previous: number,
  kind: 'income' | 'expense' | 'total',
) {
  if (previous === 0 || current === previous) {
    return {
      icon: 'lucide:minus',
      label: previous === 0 ? 'Sem dados' : 'Sem variação',
      tone: 'neutral' as const,
    }
  }

  const variation = ((current - previous) / Math.abs(previous)) * 100
  const increased = variation > 0
  const isGood = kind === 'expense' ? !increased : increased

  return {
    icon: increased ? 'lucide:arrow-up' : 'lucide:arrow-down',
    label: `${Math.abs(variation).toFixed(0)}% ${increased ? 'a mais' : 'a menos'} que o mês passado`,
    tone: isGood ? 'positive' as const : 'negative' as const,
  }
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
  tone: 'total' | 'income' | 'expense'
}) {
  return [
    fin.summaryCard,
    card.active && fin.summaryCardActive,
    card.tone === 'income' && fin.summaryIncome,
    card.tone === 'expense' && fin.summaryExpense,
    card.tone === 'total' && fin.summaryTotal,
  ]
}

function getSummaryTrendClass(tone: 'neutral' | 'positive' | 'negative') {
  return [
    fin.summaryTrend,
    tone === 'positive' && fin.summaryTrendPositive,
    tone === 'negative' && fin.summaryTrendNegative,
  ]
}

function getSummaryValueClass(tone: 'total' | 'income' | 'expense') {
  return [
    fin.summaryValue,
    tone === 'income' && fin.summaryValueIncome,
    tone === 'expense' && fin.summaryValueExpense,
    tone === 'total' && fin.summaryValueTotal,
  ]
}

function statusIcon(entry: FinancialEntryRecord) {
  if (entry.status === 'CANCELED') {
    return 'lucide:circle-off'
  }

  if (entry.status === 'PAID') {
    return 'lucide:thumbs-up'
  }

  return 'lucide:thumbs-down'
}

function getStatusIconClass(entry: FinancialEntryRecord) {
  return [
    fin.statusToggle,
    entry.status === 'OPEN' && fin.statusOpenButton,
  ]
}

function statusTooltip(entry: FinancialEntryRecord) {
  if (entry.status === 'PAID') {
    return canPayEntries.value
      ? 'Pago. Clique para reabrir.'
      : 'Pago.'
  }

  if (entry.status === 'CANCELED') {
    return 'Cancelado.'
  }

  return canPayEntries.value
    ? 'Em aberto. Clique para marcar como pago.'
    : 'Em aberto.'
}

function toggleEntryStatus(entry: FinancialEntryRecord) {
  if (!canPayEntries.value || entry.status === 'CANCELED') {
    return
  }

  if (entry.status === 'PAID') {
    askReopenEntry(entry)
    return
  }

  openPaymentModal(entry)
}

function directionLabel(entry: FinancialEntryRecord) {
  if (entry.type === 'TRANSFER') {
    return 'Transferência'
  }

  return entry.direction === 'INCOME' ? 'Entrada' : 'Saída'
}

function directionIcon(entry: FinancialEntryRecord) {
  if (entry.type === 'TRANSFER') {
    return 'lucide:arrow-left-right'
  }

  return entry.direction === 'INCOME'
    ? 'lucide:circle-arrow-out-down-right'
    : 'lucide:circle-arrow-out-up-left'
}

function getDirectionIconClass(entry: FinancialEntryRecord) {
  return [
    fin.directionIcon,
    entry.direction === 'INCOME' && fin.directionIncome,
    entry.direction === 'EXPENSE' && fin.directionExpense,
  ]
}

function hasInstallmentIndicator(entry: FinancialEntryRecord) {
  return entry.recurrenceType === 'INSTALLMENT'
    && Boolean(entry.recurrenceIndex)
    && Boolean(entry.recurrenceTotal)
}

function hasRecurringIndicator(entry: FinancialEntryRecord) {
  return entry.recurrenceType === 'FIXED'
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
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function accountAvatarSrc(entry: FinancialEntryRecord) {
  return getInstitutionLogoByKey(entry.accountInstitutionLogoKey)
}

function accountAvatarInitials(entry: FinancialEntryRecord) {
  return getAccountInitials(entry.accountInstitutionName || entry.accountName)
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
    compact-table
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
                      no-message
                      :options="[...entryDirectionOptions]"
                      placeholder="Todas as direções"
                      @update:model-value="setDirection(String($event ?? ''))"
                    )
                    dd-select(
                      :model-value="entriesStore.filters.status"
                      no-message
                      :options="[...entryStatusOptions]"
                      placeholder="Todos os status"
                      @update:model-value="setStatus(String($event ?? ''))"
                    )
                    dd-select(
                      :model-value="entriesStore.filters.accountId"
                      no-message
                      :options="accountOptions"
                      placeholder="Todas as contas"
                      @update:model-value="setAccount(String($event ?? ''))"
                    )
                    dd-select(
                      :model-value="entriesStore.filters.paymentMethodId"
                      no-message
                      :options="paymentMethodOptions"
                      placeholder="Todas as formas de pagamento"
                      @update:model-value="setPaymentMethod(String($event ?? ''))"
                    )
                    dd-select(
                      :model-value="entriesStore.filters.categoryId"
                      no-message
                      :options="categoryOptions"
                      placeholder="Todas as categorias"
                      @update:model-value="setCategory(String($event ?? ''))"
                    )
                    dd-select(
                      :model-value="entriesStore.filters.contactId"
                      no-message
                      :options="contactOptions"
                      placeholder="Todos os contatos"
                      @update:model-value="setContact(String($event ?? ''))"
                    )
                    dd-select(
                      :model-value="entriesStore.filters.tagId"
                      no-message
                      :options="tagOptions"
                      placeholder="Todas as tags"
                      @update:model-value="setTag(String($event ?? ''))"
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
          button(
            v-for="card in summaryCards"
            :key="card.key"
            type="button"
            :class="getSummaryCardClass(card)"
            @click="card.onClick()"
          )
            dd-card
              dd-stack(compact nogap)
                span(:class="fin.summaryLabel") {{ card.label }}
                strong(:class="getSummaryValueClass(card.tone)") {{ card.value }}
                span(:class="getSummaryTrendClass(card.trend.tone)")
                  icon(:name="card.trend.icon")
                  | {{ card.trend.label }}

    template(#empty)
      backoffice-empty-state(
        title="Nenhum lançamento encontrado"
        message="Ajuste os filtros deste período ou cadastre o primeiro lançamento para começar."
      )

    template(#cell-description="{ row }")
      dd-cluster(between compact :class="fin.descriptionCell")
        dd-stack(compact nogap)
          strong {{ row.description }}
          span(v-if="row.notes" :class="fin.notes") {{ row.notes }}
        dd-badge(
          v-if="hasInstallmentIndicator(row)"
          info
          :title="`Parcela ${row.recurrenceIndex} de ${row.recurrenceTotal}`"
          :aria-label="`Parcela ${row.recurrenceIndex} de ${row.recurrenceTotal}`"
        ) {{ row.recurrenceIndex }}/{{ row.recurrenceTotal }}
        dd-popover(v-else-if="hasRecurringIndicator(row)" trigger="hover" placement="top" :offset="6")
          span(
            :class="fin.recurrenceIcon"
            title="Lançamento recorrente"
            aria-label="Lançamento recorrente"
          )
            icon(name="lucide:repeat")
          template(#content)
            span Lançamento recorrente

    template(#cell-direction="{ row }")
      dd-popover(trigger="hover" placement="top" :offset="6")
        span(
          :class="getDirectionIconClass(row)"
          :title="directionLabel(row)"
          :aria-label="directionLabel(row)"
        )
          icon(:name="directionIcon(row)")
        template(#content)
          span {{ directionLabel(row) }}

    template(#cell-categoryName="{ row }")
      span {{ row.subcategoryName ? `${row.categoryName} / ${row.subcategoryName}` : row.categoryName ?? '-' }}

    template(#cell-contactName="{ row }")
      span {{ row.contactName ?? '-' }}

    template(#cell-accountName="{ row }")
      dd-popover(trigger="hover" placement="top" :offset="6")
        template(#default)
          dd-avatar(
            v-if="accountAvatarSrc(row)"
            small
            :src="accountAvatarSrc(row)"
            :alt="row.accountName"
          )
          span(v-else :class="fin.accountInitials") {{ accountAvatarInitials(row) }}
        template(#content)
          span {{ row.accountName }}

    template(#cell-effectiveDueDate="{ row }")
      span {{ formatShortDate(row.effectiveDueDate) }}

    template(#cell-amount="{ row }")
      strong(:class="row.direction === 'INCOME' ? fin.amountIncome : fin.amountExpense") {{ formatCurrency(row.amount) }}

    template(#cell-status="{ row }")
      dd-popover(trigger="hover" placement="top" :offset="6")
        dd-button(
          ghost
          tiny
          icon-only
          type="button"
          :success="row.status === 'PAID'"
          :danger="row.status === 'CANCELED'"
          :class="getStatusIconClass(row)"
          :icon="statusIcon(row)"
          :title="statusTooltip(row)"
          :aria-label="statusTooltip(row)"
          :aria-disabled="row.status === 'CANCELED' || !canPayEntries"
          :disabled="statusActionLoading === row.id"
          @click="toggleEntryStatus(row)"
        )
        template(#content)
          span {{ statusTooltip(row) }}

    template(#cell-actions="{ row }")
      dd-popover(trigger="click" placement="left-start")
        dd-button(
          ghost
          tiny
          icon-only
          type="button"
          icon="lucide:ellipsis-vertical"
          aria-label="Ações do lançamento"
          :disabled="statusActionLoading === row.id"
        )
        template(#content)
          dd-stack(nogap :class="fin.actionsMenu")
            dd-button(
              v-if="canPayEntries && row.status === 'OPEN'"
              ghost
              full
              tiny
              success
              icon="lucide:check"
              :class="fin.actionsMenuOption"
              @click="runActionFromMenu(() => openPaymentModal(row), $event)"
            ) Marcar como pago
            dd-button(
              v-if="canPayEntries && row.status === 'PAID'"
              ghost
              full
              tiny
              warning
              icon="lucide:rotate-ccw"
              :class="fin.actionsMenuOption"
              @click="runActionFromMenu(() => askReopenEntry(row), $event)"
            ) Reabrir lançamento
            dd-button(
              v-if="canUpdateEntries && row.type !== 'TRANSFER'"
              ghost
              full
              tiny
              info
              icon="lucide:pencil"
              :class="fin.actionsMenuOption"
              :disabled="row.status === 'CANCELED'"
              @click="runActionFromMenu(() => openEditEntry(row), $event)"
            ) Editar
            dd-button(
              ghost
              full
              tiny
              info
              icon="lucide:eye"
              :class="fin.actionsMenuOption"
              @click="runActionFromMenu(() => openEntryDetails(row), $event)"
            ) Ver detalhes
            dd-button(
              v-if="canCancelEntries && row.status !== 'CANCELED'"
              ghost
              full
              tiny
              danger
              icon="lucide:x"
              :class="[fin.actionsMenuOption, fin.actionsMenuDanger]"
              @click="runActionFromMenu(() => askCancelEntry(row), $event)"
            ) Cancelar
            dd-button(
              v-if="canDeleteEntries && row.status === 'OPEN' && row.type !== 'TRANSFER' && !row.paymentDate && !row.recurrenceGroupId"
              ghost
              full
              tiny
              danger
              icon="lucide:trash-2"
              :class="[fin.actionsMenuOption, fin.actionsMenuDanger]"
              @click="runActionFromMenu(() => askDeleteEntry(row), $event)"
            ) Excluir

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

  backoffice-financial-entry-details-modal(
    v-model:open="detailsModalOpen"
    :entry="detailsEntry"
  )

  backoffice-financial-entry-action-confirm-modal(
    v-model:open="actionModalOpen"
    :entry="actionTarget"
    :action="actionKind"
    :loading="Boolean(statusActionLoading)"
    @confirm="confirmEntryAction"
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
  color: var(--dd-color-gray);
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
  --dd-card-border-color: v('color.light-gray');
  --summary-card-bg: v('color.info.50');
  --summary-card-border: v('color.info.300');

  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  inline-size: 100%;
  padding: 0;
  text-align: center;
  transition: transform .2s ease;
}

.summaryCard:is(:hover, :focus-visible),
.summaryCardActive {
  --dd-card-box-shadow: v('shadow.xl');

  transform: translateY(-1px);
}

.summaryCard:is(:hover, :focus-visible) {
  --dd-card-background-color: var(--summary-card-bg);
  --dd-card-border-color: var(--summary-card-border);
}

.summaryCardActive {
  transform: none;
}

.summaryLabel {
  color: var(--dd-color-gray);
  font-size: v('font-size.sm');
}

.summaryValue {
  font-size: v('font-size.xl');
  line-height: v('line-height.tight');
}

.summaryTotal {
  --summary-card-bg: v('color.info.50');
  --summary-card-border: v('color.info.300');

  color: v('color.info.700');
}

.summaryIncome {
  --summary-card-bg: v('color.success.50');
  --summary-card-border: v('color.success.300');

  color: v('color.success.700');
}

.summaryValueIncome {
  color: v('color.success.700');
}

.summaryExpense {
  --summary-card-bg: v('color.danger.50');
  --summary-card-border: v('color.danger.300');

  color: v('color.danger.700');
}

.summaryValueExpense {
  color: v('color.danger.700');
}

.summaryValueTotal {
  color: v('color.info.700');
}

.summaryTrend {
  align-items: center;
  color: var(--dd-color-gray);
  display: inline-flex;
  font-size: v('font-size.xs');
  gap: v('space.xxs');
  justify-content: center;
  margin-block-start: v('space.xxs');
}

.summaryTrendPositive {
  color: v('color.success.700');
}

.summaryTrendNegative {
  color: v('color.danger.700');
}

.notes {
  color: var(--dd-color-gray);
  font-size: v('font-size.xs');
}

.descriptionCell {
  align-items: center;
  flex-wrap: nowrap;
  gap: v('space.sm');
  padding-inline-end: v('space.lg');
}

.directionIcon,
.recurrenceIcon {
  align-items: center;
  display: inline-flex;
  font-size: 1.2rem;
  justify-content: center;
}

.directionIncome {
  color: v('color.success.400');
}

.directionExpense {
  color: v('color.danger.400');
}

.recurrenceIcon {
  color: v('color.info.700');
}

.accountInitials {
  align-items: center;
  background: v('color.secondary.200');
  border-radius: 999px;
  color: v('color.secondary.700');
  display: inline-flex;
  font-size: .6875rem;
  font-weight: v('font-weight.semi-bold');
  justify-content: center;
  block-size: 1.75rem;
  inline-size: 1.75rem;
  text-transform: uppercase;
}

.amountIncome {
  color: v('color.success.700');
}

.amountExpense {
  color: v('color.danger.700');
}

.actionsMenu {
  min-inline-size: 9.5rem;
}

.actionsMenuOption {
  justify-content: flex-start;
}

.actionsMenuDanger {
  color: v('color.danger.700');
}

.statusOpenButton {
  --dd-button-base-color: v('color.gray.200');
}

tbody tr:has(.statusOpenButton) {
  background-color: color-mix(in srgb, v('color.warning.50') 35%, v('color.bg.surface'));
}
</style>
