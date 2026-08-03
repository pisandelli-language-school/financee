// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive, ref, Suspense } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import DashboardIndexPage from '~/pages/dashboard/index.vue'
import ConfiguracoesIndexPage from '~/pages/configuracoes/index.vue'
import RelatoriosIndexPage from '~/pages/relatorios/index.vue'

const navigateTo = vi.fn()

function createDashboardStore(currentView: 'FINANCIAL' | 'OPERATIONAL' = 'FINANCIAL') {
  return reactive({
    currentView,
  })
}

let dashboardStore = createDashboardStore()

vi.mock('~~/stores/useDashboardStore', () => ({
  useDashboardStore: () => dashboardStore,
}))

const globalStubs = {
  'backoffice-page-header': {
    props: ['title', 'description'],
    template: '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot /></header>',
  },
  'backoffice-config-card': {
    props: ['card'],
    template: '<a :href="card.to">{{ card.title }}</a>',
  },
  'backoffice-config-card-skeleton': {
    template: '<div>Carregando</div>',
  },
  'dd-stack': { template: '<div><slot /></div>' },
  'dd-grid': { template: '<div><slot /></div>' },
  'dd-center': { template: '<div><slot /></div>' },
  'dd-loading': {
    props: ['label'],
    template: '<div>{{ label }}</div>',
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

describe('critical navigation smoke', () => {
  beforeEach(() => {
    dashboardStore = createDashboardStore()
    navigateTo.mockReset()
    vi.stubGlobal('navigateTo', navigateTo)
    vi.stubGlobal('useState', () => ref(false))
    vi.stubGlobal('useBackofficeSections', () => ({
      getBreadcrumb: () => ({ routes: [{ label: 'Configurações' }] }),
      getSectionMeta: (key: string) => ({
        title: key === 'configuracoes' ? 'Configurações' : key,
        description: `${key} description`,
      }),
    }))
    vi.stubGlobal('useBackofficeNavigation', () => ({
      backofficeCards: [
        { title: 'Categorias', to: '/configuracoes/categorias', icon: 'lucide:folder' },
        { title: 'Contatos', to: '/configuracoes/contatos', icon: 'lucide:contact' },
      ],
    }))
  })

  it('redirects dashboard index to the financial dashboard by default', async () => {
    await mountPage(DashboardIndexPage)

    expect(navigateTo).toHaveBeenCalledWith('/dashboard/financeiro', {
      replace: true,
    })
  })

  it('redirects dashboard index to the operational dashboard when that view is active', async () => {
    dashboardStore = createDashboardStore('OPERATIONAL')

    await mountPage(DashboardIndexPage)

    expect(navigateTo).toHaveBeenCalledWith('/dashboard/operacional', {
      replace: true,
    })
  })

  it('renders configuration hub links for the main backoffice sections', async () => {
    const wrapper = await mountPage(ConfiguracoesIndexPage)

    expect(wrapper.text()).toContain('Configurações')
    expect(wrapper.html()).toContain('/configuracoes/categorias')
    expect(wrapper.html()).toContain('/configuracoes/contatos')
  })

  it('renders report hub links for the analytical subpages', async () => {
    const wrapper = await mountPage(RelatoriosIndexPage)

    expect(wrapper.text()).toContain('Relatórios')
    expect(wrapper.html()).toContain('/relatorios/fluxo-caixa')
    expect(wrapper.html()).toContain('/relatorios/dre')
    expect(wrapper.html()).toContain('/relatorios/inadimplencia')
    expect(wrapper.html()).toContain('/relatorios/contratos')
  })
})
