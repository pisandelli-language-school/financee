// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, reactive, ref, Suspense, watch } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import CategoriasPage from '~/pages/configuracoes/categorias.vue'
import ContatosPage from '~/pages/configuracoes/contatos.vue'
import {
  categoryToForm,
  contactToForm,
  createEmptyCategoryForm,
  createEmptyContactForm,
} from '~/composables/useBackofficeForms'

import type { CategoryRecord, ContactRecord } from '~/types/backoffice'

const fetchCategories = vi.fn()
const fetchContacts = vi.fn()
const listParentCategories = vi.fn()

const categoryRecord: CategoryRecord = {
  id: 'cat-1',
  name: 'Mensalidades',
  type: 'INCOME',
  dreGroup: 'OPERATING_REVENUE',
  parentId: null,
  parentName: null,
  subcategoryCount: 0,
  isActive: true,
  createdAt: '2026-08-03T00:00:00.000Z',
  updatedAt: '2026-08-03T00:00:00.000Z',
}

const contactRecord: ContactRecord = {
  id: 'contact-1',
  name: 'Pedro Pisandelli',
  roles: ['CLIENT'],
  nature: 'INDIVIDUAL',
  email: 'pedro@example.com',
  phone: '(85) 99999-0000',
  document: '123.456.789-00',
  tradeName: '',
  financialResponsible: null,
  address: {
    postalCode: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    country: 'Brasil',
  },
  notes: '',
  isActive: true,
  createdAt: '2026-08-03T00:00:00.000Z',
  updatedAt: '2026-08-03T00:00:00.000Z',
}

function createCategoriesStore() {
  return reactive({
    data: [categoryRecord],
    total: 1,
    loading: false,
    error: null,
    filters: {
      search: '',
      type: '',
      page: 1,
      pageSize: 50,
    },
    async fetch() {
      fetchCategories()
      return { items: this.data, total: this.total }
    },
    setFilters(nextFilters: Partial<typeof this.filters>) {
      Object.assign(this.filters, nextFilters)
    },
    async createItem() {},
    async updateItem() {},
    async removeItem() {},
  })
}

function createContactsStore() {
  return reactive({
    data: [contactRecord],
    total: 1,
    loading: false,
    error: null,
    filters: {
      search: '',
      role: '',
      nature: '',
      page: 1,
      pageSize: 50,
    },
    async fetch() {
      fetchContacts()
      return { items: this.data, total: this.total }
    },
    setFilters(nextFilters: Partial<typeof this.filters>) {
      Object.assign(this.filters, nextFilters)
    },
    async createItem() {},
    async updateItem() {},
    async removeItem() {},
  })
}

let categoriesStore = createCategoriesStore()
let contactsStore = createContactsStore()

vi.mock('~~/stores/useCategoriesStore', () => ({
  useCategoriesStore: () => categoriesStore,
}))

vi.mock('~~/stores/useContactsStore', () => ({
  useContactsStore: () => contactsStore,
}))

vi.mock('~/api/backoffice', () => ({
  CategoryModule: {
    list: (...args: unknown[]) => listParentCategories(...args),
  },
}))

const globalStubs = {
  'backoffice-page-header': {
    props: ['title', 'description'],
    template: '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot /></header>',
  },
  'backoffice-list-panel': {
    props: ['data'],
    template: '<section><div><slot name="toolbar" /></div><div v-if="data?.length"><slot name="cell-actions" :row="data[0]" /></div><slot name="empty" /></section>',
  },
  'backoffice-row-actions': {
    emits: ['edit', 'delete'],
    template: '<div><button class="row-edit" @click="$emit(\'edit\')">Editar</button><button class="row-delete" @click="$emit(\'delete\')">Excluir</button></div>',
  },
  'backoffice-empty-state': {
    props: ['title', 'message'],
    template: '<div>{{ title }} {{ message }}</div>',
  },
  'backoffice-category-modal-form': {
    props: ['open', 'title'],
    template: '<div v-if="open" data-testid="category-modal">{{ title }}</div>',
  },
  'backoffice-contact-modal-form': {
    props: ['open', 'title'],
    template: '<div v-if="open" data-testid="contact-modal">{{ title }}</div>',
  },
  'backoffice-delete-modal': {
    props: ['open', 'title'],
    template: '<div v-if="open">{{ title }}</div>',
  },
  'dd-stack': { template: '<div><slot /></div>' },
  'dd-cluster': { template: '<div><slot /></div>' },
  'dd-input': {
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)">',
  },
  'dd-select': {
    props: ['modelValue', 'options', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-if="placeholder" value="">{{ placeholder }}</option><option v-for="item in options" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
  },
  'dd-button': {
    props: ['icon', 'primary'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
  },
  'dd-badge': { template: '<span><slot /></span>' },
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

describe('backoffice modal actions smoke', () => {
  beforeEach(() => {
    categoriesStore = createCategoriesStore()
    contactsStore = createContactsStore()
    fetchCategories.mockClear()
    fetchContacts.mockClear()
    listParentCategories.mockReset()
    listParentCategories.mockResolvedValue({
      items: [categoryRecord],
      total: 1,
    })

    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('createEmptyCategoryForm', createEmptyCategoryForm)
    vi.stubGlobal('categoryToForm', categoryToForm)
    vi.stubGlobal('createEmptyContactForm', createEmptyContactForm)
    vi.stubGlobal('contactToForm', contactToForm)
    vi.stubGlobal('useAsyncData', async (_key: string, handler: () => Promise<unknown>) => {
      await handler()
      return { status: ref('success') }
    })
    vi.stubGlobal('useDebounceFn', (fn: (...args: unknown[]) => unknown) => fn)
    vi.stubGlobal('useToaster', () => ({ showToast: vi.fn() }))
    vi.stubGlobal('useBackofficeSections', () => ({
      getBreadcrumb: () => ({ routes: [{ label: 'Configurações' }] }),
      getSectionMeta: (key: string) => ({
        title: key === 'categorias' ? 'Categorias' : 'Contatos',
        description: `${key} description`,
      }),
    }))
    vi.stubGlobal('useBackofficeApiFeedback', () => ({
      getErrorMessage: () => 'erro',
      getDeleteBlockReason: () => null,
    }))
  })

  it('opens the category modal from the create action', async () => {
    const wrapper = await mountPage(CategoriasPage)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="category-modal"]').text()).toContain('Nova categoria')
  })

  it('opens the category modal in edit mode from row actions', async () => {
    const wrapper = await mountPage(CategoriasPage)

    await wrapper.get('.row-edit').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="category-modal"]').text()).toContain('Editar categoria')
  })

  it('opens the contact modal from the create action', async () => {
    const wrapper = await mountPage(ContatosPage)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="contact-modal"]').text()).toContain('Novo contato')
  })

  it('opens the contact modal in edit mode from row actions', async () => {
    const wrapper = await mountPage(ContatosPage)

    await wrapper.get('.row-edit').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="contact-modal"]').text()).toContain('Editar contato')
  })
})
