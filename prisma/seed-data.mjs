export const financialInstitutions = [
  { code: 'banco-do-brasil', name: 'Banco do Brasil', logoKey: 'banco-do-brasil' },
  { code: 'bradesco', name: 'Bradesco', logoKey: 'bradesco' },
  { code: 'caixa', name: 'Caixa Econômica', logoKey: 'caixa' },
  { code: 'inter', name: 'Banco Inter', logoKey: 'inter' },
  { code: 'itau', name: 'Itaú', logoKey: 'itau' },
  { code: 'nubank', name: 'Nubank', logoKey: 'nubank' },
  { code: 'pagbank', name: 'PagBank', logoKey: 'pagbank' },
  { code: 'santander', name: 'Santander', logoKey: 'santander' },
]

export const automationRules = [
  {
    key: 'contract-ending-soon',
    title: 'Contrato próximo do fim',
    severity: 'WARNING',
    config: {
      daysBeforeEnd: 15,
      recipientRoles: ['Admin', 'Gestor', 'Comercial'],
    },
  },
  {
    key: 'overdue-entry',
    title: 'Lançamento vencido',
    severity: 'CRITICAL',
    config: {
      daysAfterDue: 0,
      recipientRoles: ['Admin', 'Gestor', 'Financeiro'],
    },
  },
  {
    key: 'entry-due-soon',
    title: 'Lançamento próximo do vencimento',
    severity: 'WARNING',
    config: {
      daysBeforeDue: 3,
      recipientRoles: ['Admin', 'Gestor', 'Financeiro'],
    },
  },
  {
    key: 'negative-cash-flow',
    title: 'Fluxo de caixa negativo',
    severity: 'WARNING',
    config: {
      threshold: 0,
      recipientRoles: ['Admin', 'Gestor', 'Financeiro'],
    },
  },
  {
    key: 'contract-without-generated-entries',
    title: 'Contrato sem lançamentos gerados',
    severity: 'WARNING',
    config: {
      graceDays: 3,
      recipientRoles: ['Admin', 'Gestor', 'Financeiro', 'Comercial'],
    },
  },
  {
    key: 'contract-without-payment-condition',
    title: 'Contrato sem condição de pagamento',
    severity: 'WARNING',
    config: {
      recipientRoles: ['Admin', 'Gestor', 'Financeiro', 'Comercial'],
    },
  },
]

export const jobDefinitions = [
  {
    key: 'check-contracts',
    title: 'Verificar contratos próximos do fim',
    mode: 'BOTH',
    scheduleLabel: 'Diariamente',
  },
  {
    key: 'check-overdue-entries',
    title: 'Verificar lançamentos vencidos',
    mode: 'BOTH',
    scheduleLabel: 'Diariamente',
  },
  {
    key: 'check-cashflow',
    title: 'Monitorar fluxo de caixa',
    mode: 'BOTH',
    scheduleLabel: 'Diariamente',
  },
  {
    key: 'check-contracts-without-entries',
    title: 'Verificar contratos sem lançamentos',
    mode: 'BOTH',
    scheduleLabel: 'Diariamente',
  },
  {
    key: 'extend-recurrence-window',
    title: 'Estender janela de recorrências',
    mode: 'BOTH',
    scheduleLabel: 'Diariamente',
  },
  {
    key: 'expire-notifications',
    title: 'Arquivar notificações lidas antigas',
    mode: 'BOTH',
    scheduleLabel: 'Diariamente',
  },
  {
    key: 'purge-integration-payloads',
    title: 'Limpar payloads antigos de integração',
    mode: 'BOTH',
    scheduleLabel: 'Diariamente',
  },
]
