import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ReportingModule } from '~/api/reporting'
import type {
  DashboardFilters,
  DashboardView,
  FinancialDashboardData,
  OperationalDashboardData,
  ReportRegime,
  ReportingDateRangeFilters,
} from '~/types/reporting'

const defaultFilters = (): DashboardFilters => ({
  period: '',
  dateFrom: '',
  dateTo: '',
  regime: 'CASH',
})

export const useDashboardStore = defineStore('dashboard', () => {
  const currentView = ref<DashboardView>('FINANCIAL')
  const filters = ref<DashboardFilters>(defaultFilters())
  const financial = ref<FinancialDashboardData | null>(null)
  const operational = ref<OperationalDashboardData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isValueHidden = ref(false)

  function setView(nextView: DashboardView) {
    currentView.value = nextView
  }

  function setFilters(nextFilters: Partial<DashboardFilters>) {
    filters.value = {
      ...filters.value,
      ...nextFilters,
    }
  }

  function resetFilters() {
    filters.value = defaultFilters()
  }

  function toggleValueVisibility() {
    isValueHidden.value = !isValueHidden.value
  }

  async function fetchFinancial(payload: ReportingDateRangeFilters) {
    loading.value = true
    error.value = null

    try {
      const response = await ReportingModule.getFinancialDashboard({
        ...payload,
        regime: filters.value.regime,
      })

      financial.value = response
      return response
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar o dashboard financeiro.'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function fetchOperational(payload: ReportingDateRangeFilters) {
    loading.value = true
    error.value = null

    try {
      const response = await ReportingModule.getOperationalDashboard(payload)

      operational.value = response
      return response
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar o dashboard operacional.'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  function hydratePreferences(preferences: {
    dashboardDefaultView?: DashboardView | null
    lastReportRegime?: ReportRegime | null
  } | null | undefined) {
    currentView.value = preferences?.dashboardDefaultView ?? 'FINANCIAL'

    if (preferences?.lastReportRegime) {
      filters.value.regime = preferences.lastReportRegime
    }
  }

  return {
    currentView,
    filters,
    financial,
    operational,
    loading,
    error,
    isValueHidden,
    setView,
    setFilters,
    resetFilters,
    toggleValueVisibility,
    fetchFinancial,
    fetchOperational,
    hydratePreferences,
  }
})
