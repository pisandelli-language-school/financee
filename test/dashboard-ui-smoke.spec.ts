// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, onMounted, reactive, ref, Suspense, watch } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import FinanceiroPage from '~/pages/dashboard/financeiro.vue'
import OperacionalPage from '~/pages/dashboard/operacional.vue'

const showToast = vi.fn()
const updatePreferences = vi.fn().mockResolvedValue(undefined)
const fetchFinancial = vi.fn()
const fetchOperational = vi.fn()

function createDashboardStore() {
  return reactive({
    currentView: 'FINANCIAL',
    filters: {
      period: '2026-08',
      regime: 'CASH',
    },
    financial: {
      cards: [
        { key: 'net', title: 'Resultado', value: 1200, tone: 'success' },
      ],
      cashFlowTotals: {
        realizedIncome: 1000,
        realizedExpense: 200,
        realizedNet: 800,
        projectedIncome: 300,
        projectedExpense: 100,
        projectedNet: 200,
      },
      cashFlowHistory: [
        {
          periodKey: '2026-03',
          label: 'Março de 2026',
          realizedIncome: 800,
          realizedExpense: 300,
          realizedNet: 500,
          projectedIncome: 0,
          projectedExpense: 0,
          projectedNet: 0,
        },
        {
          periodKey: '2026-08',
          label: 'Agosto de 2026',
          realizedIncome: 1000,
          realizedExpense: 200,
          realizedNet: 800,
          projectedIncome: 0,
          projectedExpense: 0,
          projectedNet: 0,
        },
      ],
      delinquencyTotals: {
        count: 2,
        amount: 500,
        low: 1,
        medium: 1,
        high: 0,
      },
    },
    operational: {
      cards: [
        { key: 'contracts', title: 'Contratos ativos', value: '4', tone: 'info' },
      ],
      history: [
        {
          periodKey: '2026-07',
          label: 'Julho de 2026',
          activeContracts: 3,
          renewedContracts: 1,
          openEntries: 2,
          paidEntries: 4,
        },
        {
          periodKey: '2026-08',
          label: 'Agosto de 2026',
          activeContracts: 4,
          renewedContracts: 0,
          openEntries: 1,
          paidEntries: 3,
        },
      ],
    },
    loading: false,
    error: null,
    setView(nextView: 'FINANCIAL' | 'OPERATIONAL') {
      this.currentView = nextView
    },
    setFilters(nextFilters: Partial<{ period: string, regime: 'CASH' | 'COMPETENCE' }>) {
      Object.assign(this.filters, nextFilters)
    },
    resetFilters() {
      this.filters = {
        period: '',
        regime: 'CASH',
      }
    },
    async fetchFinancial(payload: { dateFrom: string, dateTo: string }) {
      fetchFinancial(payload)
      return this.financial
    },
    async fetchOperational(payload: { dateFrom: string, dateTo: string }) {
      fetchOperational(payload)
      return this.operational
    },
    hydratePreferences() {},
  })
}

function createPreferencesStore() {
  return reactive({
    hydrated: true,
    async updatePreferences(payload: unknown) {
      updatePreferences(payload)
    },
  })
}

let dashboardStore = createDashboardStore()
let preferencesStore = createPreferencesStore()

vi.mock('~~/stores/useDashboardStore', () => ({
  useDashboardStore: () => dashboardStore,
}))

vi.mock('~~/stores/useUserPreferencesStore', () => ({
  useUserPreferencesStore: () => preferencesStore,
}))

const globalStubs = {
  'backoffice-page-header': {
    props: ['title', 'description'],
    template: '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot /></header>',
  },
  'dd-stack': { template: '<div><slot /></div>' },
  'dd-card': { template: '<section><slot /></section>' },
  'dd-cluster': { template: '<div><slot /></div>' },
  'dd-grid': { template: '<div><slot /></div>' },
  'dd-alert': { template: '<div><slot /></div>' },
  'dd-badge': { template: '<span><slot /></span>' },
  'dd-accordion-group': { template: '<div><slot /></div>' },
  'dd-accordion': {
    props: ['title'],
    template: '<section><h3>{{ title }}</h3><slot /></section>',
  },
  'dd-select': {
    props: ['modelValue', 'options', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-if="placeholder" value="">{{ placeholder }}</option><option v-for="item in options" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
  },
  'dd-button': {
    props: ['to', 'primary', 'outline', 'icon', 'iconOnly', 'ariaLabel'],
    emits: ['click'],
    template: '<button :aria-label="ariaLabel" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  'dashboard-chart-panel': {
    name: 'DashboardChartPanel',
    props: ['title', 'description', 'option', 'loading', 'empty', 'errorMessage'],
    template: '<section><h2>{{ title }}</h2><p>{{ description }}</p><slot name="summary" /></section>',
  },
}

async function mountPage(component: unknown) {
  const wrapper = mount(defineComponent({
    render() {
      return h(Suspense, null, {
        default: () => h(component as never),
      })
    },
  }), {
    global: { stubs: globalStubs },
  })

  await flushPromises()
  return wrapper
}

describe('dashboard pages smoke', () => {
  beforeEach(() => {
    dashboardStore = createDashboardStore()
    preferencesStore = createPreferencesStore()
    fetchFinancial.mockClear()
    fetchOperational.mockClear()
    updatePreferences.mockClear()
    showToast.mockClear()
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('useToaster', () => ({ showToast }))
  })

  it('renders the financial dashboard and loads the current month range', async () => {
    const wrapper = await mountPage(FinanceiroPage)

    expect(wrapper.text()).toContain('Dashboard financeiro')
    expect(wrapper.text()).toContain('Agosto de 2026')
    expect(wrapper.text()).toContain('Entradas, saídas e resultado líquido')
    expect(wrapper.text()).toContain('De Março de 2026 a Agosto de 2026')
    expect(wrapper.text()).toContain('Temperatura da inadimplência')
    expect(wrapper.text()).toContain('Há 2 títulos em atraso, com exposição de R$ 500,00')
    expect(fetchFinancial).toHaveBeenCalledWith({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    })

    const [cashFlowChart, delinquencyChart] = wrapper.findAllComponents({ name: 'DashboardChartPanel' })
    expect(cashFlowChart.props('option')).toMatchObject({
      series: [
        { name: 'Entradas realizadas', type: 'bar', data: [800, 1000] },
        { name: 'Saídas realizadas', type: 'bar', data: [300, 200] },
        { name: 'Resultado líquido', type: 'line', data: [500, 800] },
      ],
    })
    expect(delinquencyChart.props('option')).toMatchObject({
      series: [
        {
          name: 'Temperatura da inadimplência',
          type: 'pie',
          data: [
            { name: 'Alta', value: 0 },
            { name: 'Média', value: 1 },
            { name: 'Baixa', value: 1 },
          ],
        },
      ],
    })
  })

  it('renders the operational dashboard and loads its KPI cards', async () => {
    const wrapper = await mountPage(OperacionalPage)

    expect(wrapper.text()).toContain('Dashboard operacional')
    expect(wrapper.text()).toContain('Contratos ativos')
    expect(wrapper.text()).toContain('Distribuição dos indicadores operacionais')
    expect(wrapper.text()).toContain('No período selecionado: Contratos ativos: 4.')
    expect(wrapper.text()).toContain('Evolução de contratos')
    expect(wrapper.text()).toContain('Em Agosto de 2026, havia 4 contratos ativos e 0 renovações.')
    expect(wrapper.text()).toContain('Evolução de lançamentos')
    expect(wrapper.text()).toContain('Em Agosto de 2026, foram identificados 1 lançamento em aberto e 3 lançamentos pagos.')
    expect(fetchOperational).toHaveBeenCalledWith({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    })

    const [distributionChart, contractsChart, entriesChart] = wrapper.findAllComponents({ name: 'DashboardChartPanel' })
    expect(distributionChart.props('option')).toMatchObject({
      yAxis: { data: ['Contratos ativos'] },
      series: [
        {
          name: 'Indicadores',
          type: 'bar',
          data: [
            {
              value: '4',
              itemStyle: { color: '#0277bd' },
            },
          ],
        },
      ],
    })
    expect(contractsChart.props('option')).toMatchObject({
      series: [
        { name: 'Contratos ativos', type: 'line', data: [3, 4] },
        { name: 'Renovações', type: 'line', data: [1, 0] },
      ],
    })
    expect(entriesChart.props('option')).toMatchObject({
      series: [
        { name: 'Lançamentos em aberto', type: 'line', data: [2, 1] },
        { name: 'Lançamentos pagos', type: 'line', data: [4, 3] },
      ],
    })
  })
})
