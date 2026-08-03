<script setup lang="ts">
import type { AppTableColumn } from '~/types/backoffice'
import type { AutomationRuleFormValues, AutomationRuleRecord } from '~/types/notifications'
import { useAutomationRulesStore } from '~~/stores/useAutomationRulesStore'

const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const automationStore = useAutomationRulesStore()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()
const fin = useCssModule('fin')

const meta = getSectionMeta('automacoes')
const requestError = ref('')
const modalOpen = ref(false)
const editingRule = ref<AutomationRuleRecord | null>(null)
const form = ref<AutomationRuleFormValues>({
  isEnabled: true,
  severity: 'WARNING',
  recipientRoles: [],
  daysBeforeEnd: null,
  daysBeforeDue: null,
  daysAfterDue: null,
  threshold: null,
  graceDays: null,
})

const roleOptions = [
  { label: 'Admin', value: 'Admin' },
  { label: 'Gestor', value: 'Gestor' },
  { label: 'Financeiro', value: 'Financeiro' },
  { label: 'Comercial', value: 'Comercial' },
]

const columns: AppTableColumn[] = [
  { key: 'title', title: 'Regra', sortable: true },
  { key: 'severity', title: 'Severidade', sortable: true },
  { key: 'recipients', title: 'Destinatários' },
  { key: 'isEnabled', title: 'Ativa', align: 'center', width: '5rem' },
  { key: 'actions', title: 'Ações', align: 'right', width: '64px' },
]

const ruleDescriptionMap: Record<string, string> = {
  'contract-ending-soon': 'Avisa equipes internas quando contratos estão próximos do término previsto.',
  'overdue-entry': 'Destaca títulos vencidos e ainda sem baixa para priorizar cobrança ou conferência.',
  'entry-due-soon': 'Antecipa cobranças ou conferências ao avisar sobre lançamentos que vencem nos próximos dias.',
  'negative-cash-flow': 'Sinaliza quando a leitura do caixa projetado entra em território negativo.',
  'contract-without-generated-entries': 'Aponta contratos ativos sem lançamentos derivados após a janela de tolerância.',
  'contract-without-payment-condition': 'Identifica contratos ativos sem condição de pagamento definida para evitar inconsistências.',
}

onMounted(() => {
  void automationStore.fetch()
})

function parseConfigNumber(rule: AutomationRuleRecord, key: string) {
  const value = rule.config?.[key]
  return typeof value === 'number' ? value : null
}

function parseRecipientRoles(rule: AutomationRuleRecord) {
  const value = rule.config?.recipientRoles

  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function createFormValues(rule: AutomationRuleRecord): AutomationRuleFormValues {
  return {
    isEnabled: rule.isEnabled,
    severity: rule.severity,
    recipientRoles: parseRecipientRoles(rule),
    daysBeforeEnd: parseConfigNumber(rule, 'daysBeforeEnd'),
    daysBeforeDue: parseConfigNumber(rule, 'daysBeforeDue'),
    daysAfterDue: parseConfigNumber(rule, 'daysAfterDue'),
    threshold: parseConfigNumber(rule, 'threshold'),
    graceDays: parseConfigNumber(rule, 'graceDays'),
  }
}

function createRuleConfigPayload(ruleKey: string, values: AutomationRuleFormValues) {
  return {
    recipientRoles: values.recipientRoles,
    ...(ruleKey === 'contract-ending-soon' ? { daysBeforeEnd: values.daysBeforeEnd ?? 0 } : {}),
    ...(ruleKey === 'entry-due-soon' ? { daysBeforeDue: values.daysBeforeDue ?? 0 } : {}),
    ...(ruleKey === 'overdue-entry' ? { daysAfterDue: values.daysAfterDue ?? 0 } : {}),
    ...(ruleKey === 'negative-cash-flow' ? { threshold: values.threshold ?? 0 } : {}),
    ...(ruleKey === 'contract-without-generated-entries' ? { graceDays: values.graceDays ?? 0 } : {}),
  }
}

function getRuleDescription(rule: AutomationRuleRecord) {
  return ruleDescriptionMap[rule.key] ?? 'Regra pré-configurada do MVP.'
}

function getSeverityLabel(value: AutomationRuleRecord['severity']) {
  if (value === 'CRITICAL') {
    return 'Crítica'
  }

  if (value === 'WARNING') {
    return 'Atenção'
  }

  return 'Info'
}

function getRecipientsLabel(rule: AutomationRuleRecord) {
  const recipients = parseRecipientRoles(rule)

  if (!recipients.length) {
    return 'Sem destinatários'
  }

  return recipients.join(', ')
}

function openEditModal(rule: AutomationRuleRecord) {
  editingRule.value = rule
  form.value = createFormValues(rule)
  requestError.value = ''
  modalOpen.value = true
}

async function handleToggle(rule: AutomationRuleRecord, nextValue: boolean) {
  try {
    await automationStore.toggleRule(rule.id, nextValue)
    showToast('Status da regra atualizado com sucesso.', {
      title: 'Automações',
      type: 'success',
    })
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível atualizar o status da regra.'), {
      title: 'Automações',
      type: 'error',
    })
  }
}

async function handleSave() {
  if (!editingRule.value) {
    return
  }

  requestError.value = ''

  try {
    await automationStore.updateRule(editingRule.value.id, {
      severity: form.value.severity,
      config: createRuleConfigPayload(editingRule.value.key, form.value),
    })

    if (editingRule.value.isEnabled !== form.value.isEnabled) {
      await automationStore.toggleRule(editingRule.value.id, form.value.isEnabled)
    }

    showToast('Regra atualizada com sucesso.', {
      title: 'Automações',
      type: 'success',
    })

    modalOpen.value = false
  } catch (error) {
    requestError.value = getErrorMessage(error, 'Não foi possível salvar a regra.')
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('automacoes')"
    :title="meta.title"
    :description="meta.description"
  )

  backoffice-list-panel(
    :columns="columns"
    :data="automationStore.data"
    :loading="automationStore.loading"
    :is-invalid="Boolean(automationStore.error)"
    :error-message="automationStore.error?.message ?? ''"
    :page="1"
    :total="automationStore.data.length"
    :page-size="50"
  )
    template(#cell-title="{ row }")
      dd-stack(compact nogap)
        strong {{ row.title }}
        span(:class="fin.helperText") {{ getRuleDescription(row) }}

    template(#cell-severity="{ row }")
      dd-badge(v-if="row.severity === 'CRITICAL'" danger) {{ getSeverityLabel(row.severity) }}
      dd-badge(v-else-if="row.severity === 'WARNING'" warning) {{ getSeverityLabel(row.severity) }}
      dd-badge(v-else info) {{ getSeverityLabel(row.severity) }}

    template(#cell-recipients="{ row }")
      span(:class="fin.recipients") {{ getRecipientsLabel(row) }}

    template(#cell-isEnabled="{ row }")
      dd-toggle(
        :id="`automation-enabled-${row.id}`"
        :model-value="row.isEnabled"
        aria-label="Ativar ou desativar regra"
        @update:model-value="handleToggle(row, Boolean($event))"
      )

    template(#cell-actions="{ row }")
      backoffice-row-actions(
        :show-delete="false"
        edit-label="Editar regra"
        @edit="openEditModal(row)"
      )

  backoffice-automation-rule-modal-form(
    v-if="modalOpen && editingRule"
    :open="modalOpen"
    :title="editingRule.title"
    :description="getRuleDescription(editingRule)"
    :rule-key="editingRule.key"
    :model-value="form"
    :role-options="roleOptions"
    :loading="automationStore.actionLoading"
    :error-message="requestError"
    @update:open="modalOpen = $event"
    @update:model-value="form = $event"
    @save="handleSave"
  )
</template>

<style module="fin">
.helperText,
.recipients {
  color: v('color.gray');
  font-size: v('font-size.sm');
}
</style>
