<script setup lang="ts">
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { backofficeCards } = useBackofficeNavigation()

const meta = getSectionMeta('configuracoes')
const fin = useCssModule('fin')
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
</template>

<style module="fin">
.grid {
  --dd-grid-column-min-width: 21rem;
  --dd-grid-gap: 1rem;
}
</style>
