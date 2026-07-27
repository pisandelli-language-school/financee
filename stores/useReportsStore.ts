import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ReportingModule } from '~/api/reporting'
import type {
  CashFlowReport,
  DelinquencyReport,
  DreReport,
  ReportFilters,
  ReportsView,
  ReportRegime,
} from '~/types/reporting'

const defaultFilters = (): ReportFilters => ({
  period: '',
  regime: 'CASH',
  search: '',
})

export const useReportsStore = defineStore('reports', () => {
  const currentView = ref<ReportsView>('fluxo-caixa')
  const filters = ref<ReportFilters>(defaultFilters())
  const cashFlow = ref<CashFlowReport | null>(null)
  const dre = ref<DreReport | null>(null)
  const delinquency = ref<DelinquencyReport | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function setView(nextView: ReportsView) {
    currentView.value = nextView
  }

  function setFilters(nextFilters: Partial<ReportFilters>) {
    filters.value = {
      ...filters.value,
      ...nextFilters,
    }
  }

  function resetFilters() {
    filters.value = defaultFilters()
  }

  async function fetchCashFlow(payload: {
    dateFrom: string
    dateTo: string
  }) {
    loading.value = true
    error.value = null

    try {
      const response = await ReportingModule.getCashFlow({
        ...payload,
        regime: filters.value.regime,
      })

      cashFlow.value = response
      return response
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar o fluxo de caixa.'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function fetchDre(payload: {
    dateFrom: string
    dateTo: string
  }) {
    loading.value = true
    error.value = null

    try {
      const response = await ReportingModule.getDre({
        ...payload,
        regime: filters.value.regime,
      })

      dre.value = response
      return response
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar o DRE.'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function fetchDelinquency(payload: {
    dateFrom: string
    dateTo: string
    referenceDate: string
  }) {
    loading.value = true
    error.value = null

    try {
      const response = await ReportingModule.getDelinquency(payload)

      delinquency.value = response
      return response
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar a inadimplência.'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  function hydratePreferences(preferences: {
    lastReportPeriod?: string | null
    lastReportView?: string | null
    lastReportRegime?: ReportRegime | null
  } | null | undefined) {
    if (preferences?.lastReportPeriod) {
      filters.value.period = preferences.lastReportPeriod
    }

    if (preferences?.lastReportRegime) {
      filters.value.regime = preferences.lastReportRegime
    }

    if (isReportsView(preferences?.lastReportView)) {
      currentView.value = preferences.lastReportView
    }
  }

  return {
    currentView,
    filters,
    cashFlow,
    dre,
    delinquency,
    loading,
    error,
    setView,
    setFilters,
    resetFilters,
    fetchCashFlow,
    fetchDre,
    fetchDelinquency,
    hydratePreferences,
  }
})

function isReportsView(value?: string | null): value is ReportsView {
  return value === 'fluxo-caixa'
    || value === 'dre'
    || value === 'inadimplencia'
    || value === 'contratos'
}
