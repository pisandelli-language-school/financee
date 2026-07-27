<script setup lang="ts">
import { useDashboardStore } from '~~/stores/useDashboardStore'

const dashboardStore = useDashboardStore()

await navigateTo(dashboardStore.currentView === 'OPERATIONAL'
  ? '/dashboard/operacional'
  : '/dashboard/financeiro', {
  replace: true,
})
</script>

<template lang="pug">
dd-center
  dd-loading(label="Abrindo dashboard...")
</template>
