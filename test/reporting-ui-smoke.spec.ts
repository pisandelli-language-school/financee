// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, onMounted, reactive, ref, Suspense, watch } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import FluxoCaixaPage from '~/pages/relatorios/fluxo-caixa.vue'
import DrePage from '~/pages/relatorios/dre.vue'

const showToast = vi.fn()
const updatePreferences = vi.fn().mockResolvedValue(undefined)
const fetchCashFlow = vi.fn()
const fetchDre = vi.fn()

function createReportsStore() {
  return reactive({
    currentView: 'fluxo-caixa',
    filters: {
      period: '2026-07',
      regime: 'COMPETENCE',
      search: '',
    },
    cashFlow: {
      totals: {
        realizedIncome: 1000,
        realizedExpense: 300,
        realizedNet: 700,
        projectedIncome: 500,
        projectedExpense: 100,
        projectedNet: 400,
      },
      buckets: [
        {
          label: 'Julho 2026',
          realizedIncome: 1000,
          realizedExpense: 300,
          realizedNet: 700,
          projectedIncome: 500,
          projectedExpense: 100,
          projectedNet: 400,
        },
      ],
    },
    dre: {
      totals: {
        income: 5000,
        expense: 1200,
        net: 3800,
      },
      groups: [
        {
          key: 'operacional',
          label: 'Operacional',
          amount: 3800,
          categories: [
            {
              categoryId: 'cat-1',
              categoryName: 'Mensalidades',
              amount: 3800,
            },
          ],
        },
      ],
    },
    delinquency: null,
    contracts: null,
    loading: false,
    error: null,
    setView(nextView: 'fluxo-caixa' | 'dre') {
      this.currentView = nextView
    },
    setFilters(nextFilters: Partial<{ period: string, regime: 'CASH' | 'COMPETENCE', search: string }>) {
      Object.assign(this.filters, nextFilters)
    },
    resetFilters() {},
    async fetchCashFlow(payload: { dateFrom: string, dateTo: string }) {
      fetchCashFlow(payload)
      return this.cashFlow
    },
    async fetchDre(payload: { dateFrom: string, dateTo: string }) {
      fetchDre(payload)
      return this.dre
    },
    async fetchDelinquency() {},
    async fetchContracts() {},
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

let reportsStore = createReportsStore()
let preferencesStore = createPreferencesStore()

vi.mock('~~/stores/useReportsStore', () => ({
  useReportsStore: () => reportsStore,
}))

vi.mock('~~/stores/useUserPreferencesStore', () => ({
  useUserPreferencesStore: () => preferencesStore,
}))

const globalStubs = {
  'backoffice-page-header': {
    props: ['title', 'description'],
    template: '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot /></header>',
  },
  'backoffice-empty-state': {
    props: ['title', 'message'],
    template: '<div>{{ title }} {{ message }}</div>',
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
  'dd-table': {
    props: ['columns', 'data'],
    template: '<table><tbody><tr v-for="row in data" :key="row.label ?? row.key"><td>{{ row.label ?? row.key }}</td></tr></tbody></table>',
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

describe('report pages smoke', () => {
  beforeEach(() => {
    reportsStore = createReportsStore()
    preferencesStore = createPreferencesStore()
    fetchCashFlow.mockClear()
    fetchDre.mockClear()
    updatePreferences.mockClear()
    showToast.mockClear()
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('useToaster', () => ({ showToast }))
  })

  it('renders cash flow with persisted period/regime filters', async () => {
    const wrapper = await mountPage(FluxoCaixaPage)

    expect(wrapper.text()).toContain('Fluxo de caixa')
    expect(wrapper.text()).toContain('Julho de 2026')
    expect(fetchCashFlow).toHaveBeenCalledWith({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })
  })

  it('renders DRE with the stored month and grouped content', async () => {
    const wrapper = await mountPage(DrePage)

    expect(wrapper.text()).toContain('DRE')
    expect(wrapper.text()).toContain('Operacional')
    expect(fetchDre).toHaveBeenCalledWith({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })
  })
})
