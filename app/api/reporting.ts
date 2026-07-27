import type {
  CashFlowReport,
  ContractsReport,
  DelinquencyFilters,
  DelinquencyReport,
  DreReport,
  FinancialDashboardData,
  OperationalDashboardData,
  ReportingDateRangeFilters,
  ReportingFilters,
} from '~/types/reporting'

interface ReportingRequestOptions {
  method: 'GET'
  query?: object
  headers?: Record<string, string | undefined>
}

function useReportingRequestOptions() {
  if (!import.meta.server) {
    return {}
  }

  const headers = useRequestHeaders(['cookie'])

  return { headers }
}

async function fetchReporting<T>(endpoint: string, options: ReportingRequestOptions) {
  const request = $fetch as unknown as (url: string, options: ReportingRequestOptions) => Promise<T>
  return await request(endpoint, options)
}

export const ReportingModule = {
  async getFinancialDashboard(filters: ReportingFilters) {
    const requestOptions = useReportingRequestOptions()

    return await fetchReporting<FinancialDashboardData>('/api/dashboard/financeiro', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
  async getOperationalDashboard(filters: ReportingDateRangeFilters) {
    const requestOptions = useReportingRequestOptions()

    return await fetchReporting<OperationalDashboardData>('/api/dashboard/operacional', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
  async getCashFlow(filters: ReportingFilters) {
    const requestOptions = useReportingRequestOptions()

    return await fetchReporting<CashFlowReport>('/api/relatorios/fluxo-caixa', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
  async getDre(filters: ReportingFilters) {
    const requestOptions = useReportingRequestOptions()

    return await fetchReporting<DreReport>('/api/relatorios/dre', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
  async getDelinquency(filters: DelinquencyFilters) {
    const requestOptions = useReportingRequestOptions()

    return await fetchReporting<DelinquencyReport>('/api/relatorios/inadimplencia', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
  async getContracts(filters: ReportingDateRangeFilters) {
    const requestOptions = useReportingRequestOptions()

    return await fetchReporting<ContractsReport>('/api/relatorios/contratos', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
}
