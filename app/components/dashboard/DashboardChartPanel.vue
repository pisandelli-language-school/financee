<script setup lang="ts">
import type { EChartsOption } from 'echarts'

withDefaults(defineProps<{
  title: string
  description?: string
  option?: EChartsOption
  loading?: boolean
  empty?: boolean
  emptyTitle?: string
  emptyMessage?: string
  errorMessage?: string
  loadingLabel?: string
}>(), {
  description: '',
  option: undefined,
  loading: false,
  empty: false,
  emptyTitle: 'Sem dados para visualizar',
  emptyMessage: 'Não há informações suficientes para compor este gráfico no período selecionado.',
  errorMessage: '',
  loadingLabel: 'Carregando gráfico...',
})
</script>

<template lang="pug">
dd-card(:class="fin.panel")
  dd-stack(compact :class="fin.content")
    dd-stack(v-if="title || description" compact nogap)
      strong {{ title }}
      span(v-if="description" :class="fin.description") {{ description }}

    dd-center(v-if="loading" :class="fin.state")
      dd-loading(:label="loadingLabel")

    dd-alert(v-else-if="errorMessage" danger :title="title") {{ errorMessage }}

    backoffice-empty-state(
      v-else-if="empty"
      :title="emptyTitle"
      :message="emptyMessage"
    )

    v-chart(
      v-else-if="option"
      :option="option"
      :autoresize="{ throttle: 200 }"
      :class="fin.chart"
    )

    backoffice-empty-state(
      v-else
      :title="emptyTitle"
      :message="emptyMessage"
    )

    slot(name="summary")
</template>

<style module="fin">
.panel {
  min-block-size: 24rem;
}

.description {
  color: v('color.text.muted');
  font-size: v('font-size.sm');
}

.chart,
.state {
  block-size: 18rem;
}
</style>
