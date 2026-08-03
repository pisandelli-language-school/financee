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
    expect(fetchFinancial).toHaveBeenCalledWith({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    })
  })

  it('renders the operational dashboard and loads its KPI cards', async () => {
    const wrapper = await mountPage(OperacionalPage)

    expect(wrapper.text()).toContain('Dashboard operacional')
    expect(wrapper.text()).toContain('Contratos ativos')
    expect(fetchOperational).toHaveBeenCalledWith({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    })
  })
})
