<script setup lang="ts">
import type { ConfigCard } from '~/types/backoffice'

const cards: ConfigCard[] = [
  {
    title: 'Fluxo de caixa',
    description: 'Acompanhe realizado, previsto firme e saldo projetado por período.',
    to: '/relatorios/fluxo-caixa',
    icon: 'lucide:chart-column',
  },
  {
    title: 'DRE',
    description: 'Leia receitas, despesas e resultado por grupo gerencial e categoria.',
    to: '/relatorios/dre',
    icon: 'lucide:chart-no-axes-column',
  },
  {
    title: 'Inadimplência',
    description: 'Priorize cobranças com leitura por atraso, valor exposto e temperatura.',
    to: '/relatorios/inadimplencia',
    icon: 'lucide:badge-alert',
  },
  {
    title: 'Contratos',
    description: 'Leia a base contratual do período, renovações e estados que exigem atenção.',
    to: '/relatorios/contratos',
    icon: 'lucide:file-signature',
  },
]

const breadcrumb = {
  routes: [{ label: 'Relatórios' }],
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="breadcrumb"
    title="Relatórios"
    description="Consulte visões analíticas do financeiro com filtros persistidos e leitura gerencial."
  )

  dd-stack(compact)
    dd-grid(:class="fin.grid")
      backoffice-config-card(
        v-for="card in cards"
        :key="card.title"
        :card="card"
      )

</template>

<style module="fin">
.grid {
  --dd-grid-column-min-width: 21rem;
  --dd-grid-gap: v('space.md');
}
</style>
