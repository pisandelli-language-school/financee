import type { ConfigCard } from '~/types/backoffice'

interface MenuActionLink {
  type: 'link'
  to: string
}

interface MenuActionNone {
  type: 'none'
}

export interface AppMenuItem {
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

export function useBackofficeNavigation() {
  const route = useRoute()
  const currentAuth = useState('auth:current-user', () => null as null | { permissions: string[] })
  const isInSettings = computed(() => route.path.startsWith('/configuracoes'))
  const isInReports = computed(() => route.path.startsWith('/relatorios'))
  const permissions = computed(() => currentAuth.value?.permissions ?? [])
  const can = (permissionKey: string) => permissions.value.includes(permissionKey)
  const configurationChildren = computed<AppMenuItem[]>(() => [
    {
      key: 'configuracoes-categorias',
      label: 'Categorias',
      icon: 'lucide:folders',
      active: route.path === '/configuracoes/categorias',
      action: { type: 'link', to: '/configuracoes/categorias' },
    },
    {
      key: 'configuracoes-contas-carteiras',
      label: 'Contas e carteiras',
      icon: 'lucide:wallet',
      active: route.path === '/configuracoes/contas-carteiras',
      action: { type: 'link', to: '/configuracoes/contas-carteiras' },
    },
    {
      key: 'configuracoes-centros-custo',
      label: 'Centros de custo',
      icon: 'lucide:briefcase-business',
      active: route.path === '/configuracoes/centros-custo',
      action: { type: 'link', to: '/configuracoes/centros-custo' },
    },
    {
      key: 'configuracoes-tags',
      label: 'Tags',
      icon: 'lucide:tags',
      active: route.path === '/configuracoes/tags',
      action: { type: 'link', to: '/configuracoes/tags' },
    },
    {
      key: 'configuracoes-formas-pagamento',
      label: 'Formas de pagamento',
      icon: 'lucide:credit-card',
      active: route.path === '/configuracoes/formas-pagamento',
      action: { type: 'link', to: '/configuracoes/formas-pagamento' },
    },
    {
      key: 'configuracoes-contatos',
      label: 'Contatos',
      icon: 'lucide:contact-round',
      active: route.path === '/configuracoes/contatos',
      action: { type: 'link', to: '/configuracoes/contatos' },
    },
    {
      key: 'configuracoes-dias-nao-uteis',
      label: 'Dias não úteis',
      icon: 'lucide:calendar-off',
      active: route.path === '/configuracoes/dias-nao-uteis',
      action: { type: 'link', to: '/configuracoes/dias-nao-uteis' },
    },
    ...(can('automacoes.manage')
      ? [{
          key: 'configuracoes-automacoes',
          label: 'Automações',
          icon: 'lucide:bot',
          active: route.path === '/configuracoes/automacoes',
          action: { type: 'link' as const, to: '/configuracoes/automacoes' },
        }]
      : []),
    ...(can('usuarios.manage')
      ? [{
          key: 'configuracoes-usuarios',
          label: 'Usuários',
          icon: 'lucide:users',
          active: route.path === '/configuracoes/usuarios',
          action: { type: 'link' as const, to: '/configuracoes/usuarios' },
        }]
      : []),
    ...(can('permissoes.manage')
      ? [{
          key: 'configuracoes-permissoes',
          label: 'Permissões',
          icon: 'lucide:key-round',
          active: route.path === '/configuracoes/permissoes',
          action: { type: 'link' as const, to: '/configuracoes/permissoes' },
        }]
      : []),
    ...(can('auditoria.view')
      ? [{
          key: 'configuracoes-auditoria',
          label: 'Auditoria',
          icon: 'lucide:shield-check',
          active: route.path === '/configuracoes/auditoria',
          action: { type: 'link' as const, to: '/configuracoes/auditoria' },
        }]
      : []),
    ...(can('jobs.view')
      ? [{
          key: 'configuracoes-jobs',
          label: 'Jobs',
          icon: 'lucide:clock-3',
          active: route.path === '/configuracoes/jobs',
          action: { type: 'link' as const, to: '/configuracoes/jobs' },
        }]
      : []),
  ])

  const primaryMenuItems = computed<AppMenuItem[]>(() => [
    ...(can('dashboard.view')
      ? [{
          key: 'dashboard',
          label: 'Dashboard',
          icon: 'lucide:layout-dashboard',
          active: route.path.startsWith('/dashboard'),
          action: { type: 'link' as const, to: '/dashboard' },
        }]
      : []),
    ...(can('lancamentos.view')
      ? [{
          key: 'lancamentos',
          label: 'Lançamentos',
          icon: 'lucide:arrow-right-left',
          active: route.path.startsWith('/lancamentos'),
          action: { type: 'link' as const, to: '/lancamentos' },
        }]
      : []),
    ...(can('contratos.view')
      ? [{
          key: 'contratos',
          label: 'Contratos',
          icon: 'lucide:file-signature',
          active: route.path.startsWith('/contratos'),
          action: { type: 'link' as const, to: '/contratos' },
        }]
      : []),
    ...(can('relatorios.view')
      ? [{
          key: 'relatorios',
          label: 'Relatórios',
          icon: 'lucide:bar-chart-3',
          active: isInReports.value,
          children: [
            {
              key: 'relatorios-fluxo-caixa',
              label: 'Fluxo de caixa',
              icon: 'lucide:chart-column-big',
              active: route.path === '/relatorios/fluxo-caixa',
              action: { type: 'link' as const, to: '/relatorios/fluxo-caixa' },
            },
            {
              key: 'relatorios-dre',
              label: 'DRE',
              icon: 'lucide:chart-no-axes-column',
              active: route.path === '/relatorios/dre',
              action: { type: 'link' as const, to: '/relatorios/dre' },
            },
            {
              key: 'relatorios-inadimplencia',
              label: 'Inadimplência',
              icon: 'lucide:badge-alert',
              active: route.path === '/relatorios/inadimplencia',
              action: { type: 'link' as const, to: '/relatorios/inadimplencia' },
            },
            {
              key: 'relatorios-contratos',
              label: 'Contratos',
              icon: 'lucide:file-chart-column',
              active: route.path === '/relatorios/contratos',
              action: { type: 'link' as const, to: '/relatorios/contratos' },
            },
          ],
          action: { type: 'link' as const, to: '/relatorios' },
        }]
      : []),
    {
      key: 'configuracoes',
      label: 'Configurações',
      icon: 'lucide:settings-2',
      active: isInSettings.value,
      children: configurationChildren.value,
      action: { type: 'link', to: '/configuracoes' },
    },
  ])

  return {
    backofficeCards: computed(() => [
      ...backofficeCards,
      ...(can('automacoes.manage')
        ? [{
            title: 'Automações',
            description: 'Ajuste regras pró-ativas, thresholds e destinatários internos.',
            to: '/configuracoes/automacoes',
            icon: 'lucide:bot',
          }]
        : []),
      ...(can('usuarios.manage')
        ? [{
            title: 'Usuários',
            description: 'Gerencie papéis internos, status e acesso operacional.',
            to: '/configuracoes/usuarios',
            icon: 'lucide:users',
          }]
        : []),
      ...(can('permissoes.manage')
        ? [{
            title: 'Permissões',
            description: 'Ajuste a matriz de acesso dos papéis internos do sistema.',
            to: '/configuracoes/permissoes',
            icon: 'lucide:key-round',
          }]
        : []),
      ...(can('auditoria.view')
        ? [{
            title: 'Auditoria',
            description: 'Consulte eventos críticos, mudanças e rastros operacionais.',
            to: '/configuracoes/auditoria',
            icon: 'lucide:shield-check',
          }]
        : []),
      ...(can('jobs.view')
        ? [{
            title: 'Jobs',
            description: 'Monitore rotinas agendadas, reexecuções e falhas operacionais.',
            to: '/configuracoes/jobs',
            icon: 'lucide:clock-3',
          }]
        : []),
    ]),
    primaryMenuItems,
  }
}
