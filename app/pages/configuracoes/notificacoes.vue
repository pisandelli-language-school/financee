<script setup lang="ts">
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()

const meta = getSectionMeta('notificacoes')

const severityCards = [
  {
    title: 'Info',
    description: 'Contexto operacional sem urgência. Fica disponível na central persistente.',
    color: 'info',
  },
  {
    title: 'Atenção',
    description: 'Risco moderado. Gera destaque visual e toast na operação.',
    color: 'warning',
  },
  {
    title: 'Crítica',
    description: 'Evento prioritário. Gera destaque máximo, toast e e-mail interno.',
    color: 'danger',
  },
]
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('notificacoes')"
    :title="meta.title"
    :description="meta.description"
  )

  dd-card
    dd-stack
      dd-alert(info icon :closable="false")
        strong Regras atuais do MVP
        br
        | Notificações lidas são arquivadas após 30 dias.
        br
        | Notificações não lidas não expiram automaticamente.
        br
        | Exclusões feitas pelo usuário saem da central imediatamente.

      dd-grid(:class="fin.grid")
        dd-card(
          v-for="card in severityCards"
          :key="card.title"
          :class="fin.severityCard"
        )
          dd-stack(compact nogap)
            dd-badge(:color="card.color") {{ card.title }}
            p(:class="fin.cardText") {{ card.description }}

      dd-card
        dd-stack(compact)
          strong Entrega e leitura
          dd-cluster(compact :class="fin.rules")
            dd-badge(info) Central persistente
            dd-badge(warning) Toast em WARNING
            dd-badge(danger) E-mail interno em CRITICAL
            dd-badge(secondary) Dedupe por usuário
          p(:class="fin.cardText")
            | A configuração fina de thresholds e destinatários fica em
            |  
            nuxt-link(to="/configuracoes/automacoes") Automações
            | . A leitura completa das notificações do usuário fica em
            |  
            nuxt-link(to="/notificacoes") /notificações
            | .
</template>

<style module="fin">
.grid {
  --dd-grid-column-min-width: 16rem;
  --dd-grid-gap: v('space.sm');
}

.severityCard {
  block-size: 100%;
}

.cardText {
  color: v('color.text.soft');
  margin: 0;
}

.rules {
  flex-wrap: wrap;
  gap: v('space.xs');
}
</style>
