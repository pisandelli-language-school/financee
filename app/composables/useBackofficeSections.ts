const sectionMap = {
  configuracoes: {
    title: 'Configurações',
    description: 'Acesse as bases e ajustes administrativos do sistema em um único lugar.',
  },
  contatos: {
    title: 'Contatos',
    description: 'Visualize clientes, fornecedores e outros perfis e edite sem perder contexto.',
  },
  categorias: {
    title: 'Categorias',
    description: 'Cadastre e classifique categorias financeiras em uma visão unificada.',
  },
  'contas-carteiras': {
    title: 'Contas e carteiras',
    description: 'Gerencie contas correntes, carteiras e saldos iniciais usados na operação.',
  },
  'centros-custo': {
    title: 'Centros de custo',
    description: 'Mantenha a base administrativa para classificação e análise de despesas.',
  },
  tags: {
    title: 'Tags',
    description: 'Gerencie a base de tags, inclusive cores opcionais para uso futuro.',
  },
  'formas-pagamento': {
    title: 'Formas de pagamento',
    description: 'Centralize os meios de pagamento aceitos pelo sistema.',
  },
  'dias-nao-uteis': {
    title: 'Dias não úteis',
    description: 'Cadastre datas fixas, calculadas e excepcionais para ajuste automático de vencimentos.',
  },
} as const

export function useBackofficeSections() {
  function getSectionMeta(section: keyof typeof sectionMap) {
    return sectionMap[section]
  }

  function getBreadcrumb(section?: keyof typeof sectionMap) {
    const routes: Array<{ label: string; to?: string }> = [{ label: 'Configurações', to: '/configuracoes' }]

    if (section && section !== 'configuracoes') {
      routes.push({ label: sectionMap[section].title })
    }

    return { routes }
  }

  return {
    getBreadcrumb,
    getSectionMeta,
  }
}
