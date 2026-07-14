<script setup lang="ts">
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { backofficeCards } = useBackofficeNavigation()
const currentAuthLoading = useState('auth:current-user-loading', () => false)

const meta = getSectionMeta('configuracoes')
const pendingCardsCount = 3
</script>

<template lang="pug">
dd-stack(spaced)
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('configuracoes')"
    :title="meta.title"
    :description="meta.description"
  )

  dd-grid(:class="fin.grid")
    backoffice-config-card(
      v-for="card in backofficeCards"
      :key="card.title"
      :card="card"
    )
    backoffice-config-card-skeleton(
      v-if="currentAuthLoading"
      v-for="item in pendingCardsCount"
      :key="`skeleton-${item}`"
    )
</template>

<style module="fin">
.grid {
  --dd-grid-column-min-width: 21rem;
  --dd-grid-gap: 1rem;
}
</style>
