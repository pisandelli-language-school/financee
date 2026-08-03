<script setup lang="ts">
import type { AppTableColumn } from '~/types/backoffice'
import type { JobDefinitionRecord, JobExecutionStatus, JobMode } from '~/types/jobs'
import { useJobsStore } from '~~/stores/useJobsStore'

const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const jobsStore = useJobsStore()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('jobs')
const historyOpen = ref(false)
const selectedJob = ref<JobDefinitionRecord | null>(null)

const columns: AppTableColumn[] = [
  { key: 'title', title: 'Job', sortable: true },
  { key: 'info', title: '', align: 'center', width: '3rem' },
  { key: 'mode', title: 'Modo', sortable: true },
  { key: 'scheduleLabel', title: 'Agendamento', sortable: true },
  { key: 'lastExecution', title: 'Última atividade', sortable: true },
  { key: 'status', title: 'Status', sortable: true },
  { key: 'enabled', title: 'Ativo', align: 'center', width: '5rem' },
  { key: 'actions', title: 'Ações', align: 'right', width: '8rem' },
]

const modeOptions = [
  { label: 'Todos os modos', value: '' },
  { label: 'Automático', value: 'AUTOMATIC' },
  { label: 'Manual', value: 'MANUAL' },
  { label: 'Ambos', value: 'BOTH' },
]

const statusOptions = [
  { label: 'Todos os status', value: '' },
  { label: 'Sucesso', value: 'SUCCESS' },
  { label: 'Falha', value: 'FAILED' },
  { label: 'Executando', value: 'RUNNING' },
  { label: 'Parcial', value: 'PARTIAL' },
  { label: 'Pendente', value: 'PENDING' },
]

const { status } = await useAsyncData('jobs-page', () => jobsStore.fetch())
const isLoading = computed(() => status.value === 'pending' || jobsStore.loading)

const handleSearch = useDebounceFn((value: string | number) => {
  jobsStore.setFilters({
    search: String(value),
  })
}, 300)

function handleModeFilter(value: string | number | null | undefined) {
  const nextValue = String(value ?? '')

  jobsStore.setFilters({
    mode: nextValue as JobMode | '',
  })
}

function handleStatusFilter(value: string | number | null | undefined) {
  const nextValue = String(value ?? '')

  jobsStore.setFilters({
    status: nextValue as JobExecutionStatus | '',
  })
}

function getModeLabel(value: JobMode) {
  switch (value) {
    case 'AUTOMATIC':
      return 'Automático'
    case 'MANUAL':
      return 'Manual'
    case 'BOTH':
    default:
      return 'Ambos'
  }
}

function getJobDescription(jobKey: string) {
  switch (jobKey) {
    case 'check-contracts':
      return 'Verifica contratos próximos do fim e contratos sem condição de pagamento para disparar alertas operacionais.'
    case 'check-overdue-entries':
      return 'Monitora lançamentos vencidos ou próximos do vencimento para gerar notificações de cobrança e atenção.'
    case 'check-cashflow':
      return 'Analisa o fluxo de caixa previsto para identificar risco de saldo negativo e alertar a operação.'
    case 'check-contracts-without-entries':
      return 'Procura contratos ativos sem lançamentos gerados para evitar falhas de faturamento.'
    case 'extend-recurrence-window':
      return 'Estende automaticamente a janela de lançamentos recorrentes para manter a agenda financeira abastecida.'
    case 'expire-notifications':
      return 'Arquiva notificações lidas mais antigas conforme a política atual de retenção do sistema.'
    case 'purge-integration-payloads':
      return 'Reserva técnica para limpeza futura de payloads antigos de integrações quando esse módulo existir.'
    default:
      return 'Job operacional do sistema.'
  }
}

function getStatusLabel(value: JobExecutionStatus | null, isEnabled: boolean) {
  if (!isEnabled) {
    return 'Desativado'
  }

  switch (value) {
    case 'SUCCESS':
      return 'Sucesso'
    case 'FAILED':
      return 'Falha'
    case 'RUNNING':
      return 'Executando'
    case 'PARTIAL':
      return 'Parcial'
    case 'PENDING':
      return 'Pendente'
    default:
      return 'Nunca executado'
  }
}

function getStatusColor(value: JobExecutionStatus | null, isEnabled: boolean) {
  if (!isEnabled) {
    return 'warning'
  }

  switch (value) {
    case 'SUCCESS':
      return 'success'
    case 'FAILED':
      return 'danger'
    case 'RUNNING':
      return 'info'
    case 'PARTIAL':
      return 'warning'
    default:
      return 'neutral'
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getLastActivityLabel(job: JobDefinitionRecord) {
  if (!job.isEnabled && job.disabledAt) {
    return formatDateTime(job.disabledAt)
  }

  return formatDateTime(job.lastExecution?.startedAt ?? null)
}

function getLastActivityHint(job: JobDefinitionRecord) {
  if (!job.isEnabled && job.disabledAt) {
    const actor = job.disabledByName ?? 'usuário não identificado'
    return `Desativado em ${formatDateTime(job.disabledAt)} por ${actor}.`
  }

  if (job.lastExecution?.startedAt) {
    return `Última execução iniciada em ${formatDateTime(job.lastExecution.startedAt)}.`
  }

  return ''
}

async function handleToggle(job: JobDefinitionRecord, nextValue: boolean) {
  try {
    await jobsStore.toggleJob(job.key, nextValue)
    showToast('Job atualizado com sucesso.', {
      title: 'Jobs',
      type: 'success',
    })
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível atualizar o job.'), {
      title: 'Jobs',
      type: 'error',
    })
  }
}

async function handleRun(job: JobDefinitionRecord) {
  try {
    await jobsStore.runJob(job.key)
    showToast('Job executado com sucesso.', {
      title: 'Jobs',
      type: 'success',
    })
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível executar o job.'), {
      title: 'Jobs',
      type: 'error',
    })
  }
}

async function openHistory(job: JobDefinitionRecord) {
  selectedJob.value = job
  historyOpen.value = true

  try {
    await jobsStore.loadHistory(job.key)
  } catch {
    // feedback inside modal
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('jobs')"
    :title="meta.title"
    :description="meta.description"
  )

  backoffice-list-panel(
    :columns="columns"
    :data="jobsStore.filteredData"
    :loading="isLoading"
    :is-invalid="Boolean(jobsStore.error)"
    :error-message="jobsStore.error?.message ?? ''"
    :page="1"
    :total="jobsStore.filteredData.length"
    :page-size="50"
  )
    template(#toolbar)
      dd-input(
        :model-value="jobsStore.filters.search"
        icon="lucide:search"
        placeholder="Buscar job..."
        @update:model-value="handleSearch"
      )
      dd-select(
        :model-value="jobsStore.filters.mode"
        :options="modeOptions"
        placeholder="Todos os modos"
        @update:model-value="handleModeFilter"
      )
      dd-select(
        :model-value="jobsStore.filters.status"
        :options="statusOptions"
        placeholder="Todos os status"
        @update:model-value="handleStatusFilter"
      )

    template(#cell-title="{ row }")
      dd-stack(compact nogap)
        strong {{ row.title }}
        span {{ row.key }}

    template(#cell-info="{ row }")
      dd-popover(trigger="click" placement="right-start")
        dd-button(
          ghost
          icon-only
          tiny
          info
          type="button"
          icon="lucide:info"
          aria-label="Ver descrição do job"
        )
        template(#content)
          dd-stack(compact :class="fin.helpPopover")
            strong {{ row.title }}
            p(:class="fin.helpText") {{ getJobDescription(row.key) }}

    template(#cell-mode="{ row }")
      dd-badge(info) {{ getModeLabel(row.mode) }}

    template(#cell-scheduleLabel="{ row }")
      span {{ row.scheduleLabel || 'Sob demanda' }}

    template(#cell-lastExecution="{ row }")
      span(:title="getLastActivityHint(row)") {{ getLastActivityLabel(row) }}

    template(#cell-status="{ row }")
      dd-badge(
        :success="getStatusColor(row.lastExecution?.status ?? null, row.isEnabled) === 'success'"
        :danger="getStatusColor(row.lastExecution?.status ?? null, row.isEnabled) === 'danger'"
        :info="getStatusColor(row.lastExecution?.status ?? null, row.isEnabled) === 'info'"
        :warning="getStatusColor(row.lastExecution?.status ?? null, row.isEnabled) === 'warning'"
        :neutral="getStatusColor(row.lastExecution?.status ?? null, row.isEnabled) === 'neutral'"
      ) {{ getStatusLabel(row.lastExecution?.status ?? null, row.isEnabled) }}

    template(#cell-enabled="{ row }")
      dd-toggle(
        :id="`job-enabled-${row.id}`"
        :model-value="row.isEnabled"
        aria-label="Ativar ou desativar job"
        @update:model-value="handleToggle(row, Boolean($event))"
      )

    template(#cell-actions="{ row }")
      dd-cluster(narrow end :class="fin.actions")
        dd-button(
          ghost
          icon-only
          tiny
          info
          type="button"
          icon="lucide:history"
          aria-label="Ver histórico do job"
          @click.stop.prevent="openHistory(row)"
        )
        dd-button(
          ghost
          icon-only
          tiny
          success
          type="button"
          icon="lucide:play"
          :disabled="!row.isEnabled"
          aria-label="Executar job agora"
          @click.stop.prevent="handleRun(row)"
        )

  backoffice-job-executions-modal(
    :open="historyOpen"
    :title="selectedJob?.title ?? 'Job'"
    :loading="jobsStore.historyLoading"
    :error-message="jobsStore.historyError"
    :executions="jobsStore.historyItems"
    @update:open="historyOpen = $event; if (!$event) jobsStore.resetHistory()"
  )
</template>

<style module="fin">
.actions {
  flex-wrap: nowrap;
}

.helpPopover {
  max-inline-size: 18rem;
}

.helpText {
  color: v('color.text.soft');
  margin: 0;
}
</style>
