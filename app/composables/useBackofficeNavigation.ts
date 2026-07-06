import type { ConfigCard } from '~/types/backoffice'

interface MenuActionLink {
  type: 'link'
  to: string
}

interface MenuActionNone {
  type: 'none'
}

interface AppMenuItem {
  key: string
  label: string
  icon?: string
  active?: boolean
  badge?: {
    label: string
    color?: string
  }
  children?: AppMenuItem[]
  action: MenuActionLink | MenuActionNone
}

export const backofficeCards: ConfigCard[] = [
  {
    title: 'Categorias',
    description: 'Estruture receitas, despesas e classificações da operação.',
    to: '/configuracoes/categorias',
    icon: 'lucide:folders',
  },
  {
    title: 'Contas e carteiras',
    description: 'Organize onde o dinheiro circula e acompanhe saldos base.',
    to: '/configuracoes/contas-carteiras',
    icon: 'lucide:wallet',
  },
  {
    title: 'Centros de custo',
    description: 'Separe despesas e receitas por área de análise.',
    to: '/configuracoes/centros-custo',
    icon: 'lucide:briefcase-business',
  },
  {
    title: 'Tags',
    description: 'Crie marcações reutilizáveis para filtros, relatórios e leitura rápida.',
    to: '/configuracoes/tags',
    icon: 'lucide:tags',
  },
  {
    title: 'Formas de pagamento',
    description: 'Mantenha o catálogo base dos meios aceitos no sistema.',
    to: '/configuracoes/formas-pagamento',
    icon: 'lucide:credit-card',
  },
  {
    title: 'Contatos',
    description: 'Centralize clientes, fornecedores e outros perfis em um único cadastro.',
    to: '/configuracoes/contatos',
    icon: 'lucide:contact-round',
  },
  {
    title: 'Dias não úteis',
    description: 'Defina datas fixas, calculadas e customizadas para ajuste de vencimentos.',
    to: '/configuracoes/dias-nao-uteis',
    icon: 'lucide:calendar-off',
  },
]

const configurationChildren: AppMenuItem[] = [
  {
    key: 'configuracoes-categorias',
    label: 'Categorias',
    icon: 'lucide:folders',
    action: { type: 'link', to: '/configuracoes/categorias' },
  },
  {
    key: 'configuracoes-contas-carteiras',
    label: 'Contas e carteiras',
    icon: 'lucide:wallet',
    action: { type: 'link', to: '/configuracoes/contas-carteiras' },
  },
  {
    key: 'configuracoes-centros-custo',
    label: 'Centros de custo',
    icon: 'lucide:briefcase-business',
    action: { type: 'link', to: '/configuracoes/centros-custo' },
  },
  {
    key: 'configuracoes-tags',
    label: 'Tags',
    icon: 'lucide:tags',
    action: { type: 'link', to: '/configuracoes/tags' },
  },
  {
    key: 'configuracoes-formas-pagamento',
    label: 'Formas de pagamento',
    icon: 'lucide:credit-card',
    action: { type: 'link', to: '/configuracoes/formas-pagamento' },
  },
  {
    key: 'configuracoes-contatos',
    label: 'Contatos',
    icon: 'lucide:contact-round',
    action: { type: 'link', to: '/configuracoes/contatos' },
  },
  {
    key: 'configuracoes-dias-nao-uteis',
    label: 'Dias não úteis',
    icon: 'lucide:calendar-off',
    action: { type: 'link', to: '/configuracoes/dias-nao-uteis' },
  },
]

export function useBackofficeNavigation() {
  const route = useRoute()
  const isInSettings = computed(() => route.path.startsWith('/configuracoes'))
  const activeMenuKey = computed(() => {
    if (route.path === '/configuracoes') {
      return 'configuracoes'
    }

    return route.path.replace(/\//g, '-').replace(/^-/, '')
  })

  const primaryMenuItems = computed<AppMenuItem[]>(() => [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: 'lucide:layout-dashboard',
      action: { type: 'none' },
    },
    {
      key: 'lancamentos',
      label: 'Lançamentos',
      icon: 'lucide:arrow-right-left',
      action: { type: 'none' },
    },
    {
      key: 'contratos',
      label: 'Contratos',
      icon: 'lucide:file-signature',
      action: { type: 'none' },
    },
    {
      key: 'relatorios',
      label: 'Relatórios',
      icon: 'lucide:bar-chart-3',
      action: { type: 'none' },
    },
    {
      key: 'configuracoes',
      label: 'Configurações',
      icon: 'lucide:settings-2',
      active: isInSettings.value,
      action: { type: 'link', to: '/configuracoes' },
    },
  ])

  return {
    backofficeCards,
    primaryMenuItems,
    settingsMenuItems: configurationChildren,
    activeMenuKey,
    isInSettings,
  }
}
