<script setup lang="ts">
import type { NotificationRecord } from '~/types/notifications'
import { getNotificationContextLabel } from '~/utils/notifications'

const props = withDefaults(defineProps<{
  notification: NotificationRecord
  compact?: boolean
  busy?: boolean
}>(), {
  compact: false,
  busy: false,
})

const emit = defineEmits<{
  (event: 'open', notification: NotificationRecord): void
  (event: 'read' | 'delete', id: string): void
}>()

const severityMeta = computed(() => {
  if (props.notification.severity === 'CRITICAL') {
    return {
      icon: 'lucide:triangle-alert',
      label: 'Crítica',
      toneClass: 'danger',
    } as const
  }

  if (props.notification.severity === 'WARNING') {
    return {
      icon: 'lucide:badge-alert',
      label: 'Atenção',
      toneClass: 'warning',
    } as const
  }

  return {
    icon: 'lucide:info',
    label: 'Info',
    toneClass: 'info',
  } as const
})

const formattedDate = computed(() => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: props.compact ? undefined : 'short',
}).format(new Date(props.notification.createdAt)))

const contextLabel = computed(() => {
  return getNotificationContextLabel(props.notification)
})

function handleOpen() {
  emit('open', props.notification)
}
</script>

<template lang="pug">
dd-card(
  :data-severity="severityMeta.toneClass"
  :data-isRead="props.notification.isRead"
)
  dd-stack(compact)
    nuxt-link(
      v-if="props.notification.actionUrl"
      :to="props.notification.actionUrl"
      :class="[fin.linkArea, fin.linkInteractive]"
    )
      dd-cluster(:class="fin.top")
        span(:class="[fin.iconWrap, severityMeta.toneClass === 'danger' ? fin.iconWrapDanger : severityMeta.toneClass === 'warning' ? fin.iconWrapWarning : fin.iconWrapInfo]")
          icon(:name="severityMeta.icon")
        dd-stack(compact :class="fin.main")
          dd-cluster(between :class="fin.metaTop")
            strong(:class="fin.title") {{ props.notification.title }}
            dd-badge(v-if="props.notification.isPriority && !props.notification.isRead" danger) Prioridade
          span(:class="fin.date") {{ formattedDate }}
          p(v-if="contextLabel" :class="fin.context") {{ contextLabel }}
          p(:class="fin.message") {{ props.notification.message }}
    button(
      v-else
      type="button"
      :class="[fin.linkArea, fin.linkInteractive]"
      @click="handleOpen"
    )
      dd-cluster(:class="fin.top")
        span(:class="[fin.iconWrap, severityMeta.toneClass === 'danger' ? fin.iconWrapDanger : severityMeta.toneClass === 'warning' ? fin.iconWrapWarning : fin.iconWrapInfo]")
          icon(:name="severityMeta.icon")
        dd-stack(compact nogap :class="fin.main")
          dd-cluster(between :class="fin.metaTop")
            strong(:class="fin.title") {{ props.notification.title }}
            span(:class="fin.date") {{ formattedDate }}
          p(v-if="contextLabel" :class="fin.context") {{ contextLabel }}
          p(:class="fin.message") {{ props.notification.message }}

    footer(:class="fin.footer")
      dd-cluster(narrow end :class="fin.actions")
        dd-button(
          ghost
          tiny
          icon-only
          danger
          aria-label="Excluir notificação"
          icon="lucide:trash-2"
          :disabled="props.busy"
          @click.stop="emit('delete', props.notification.id)"
        )
        dd-button(
          v-if="!props.notification.isRead"
          ghost
          icon-only
          tiny
          success
          aria-label="Marcar notificação como lida"
          icon="lucide:check"
          :disabled="props.busy"
          @click.stop="emit('read', props.notification.id)"
          )
</template>

<style module="fin">
.linkArea {
  color: inherit;
  display: block;
  inline-size: 100%;
  text-align: start;
  text-decoration: none;
}

.linkInteractive {
  border-radius: v('border-radius.md');
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.top {
  align-items: flex-start;
  flex-wrap: nowrap;
  gap: v('space.sm');
}

.iconWrap {
  align-items: center;
  block-size: 2.25rem;
  border-radius: v('border-radius.full');
  color: inherit;
  display: inline-flex;
  flex: 0 0 2.25rem;
  justify-content: center;
}

.iconWrapDanger {
  background: v('color.danger.100');
  color: v('color.danger.600');
}

.iconWrapWarning {
  background: v('color.warning.100');
  color: v('color.warning.700');
}

.iconWrapInfo {
  background: v('color.info.100');
  color: v('color.info.600');
}

.main {
  --dd-stack-compact-gap: v('space.xxs');
  min-inline-size: 0;
}

.metaTop {
  align-items: flex-start;
  gap: v('space.sm');
}

.title {
  line-height: v('line-height.tight');
  margin: 0;
}

.date {
  color: v('color.gray');
  flex: 0 0 auto;
  font-size: v('font-size.xs');
}

.context,
.message {
  margin: 0;
  text-align: start;
}

.context {
  color: v('color.gray');
  font-size: v('font-size.sm');
}

.message {
  color: v('color.gray');
  white-space: pre-line;
  font-size: v('font-size.sm');
}

.footer {
  align-items: flex-end;
  gap: v('space.sm');
}

.badges,
.actions {
  gap: v('space.xs');
}

[data-isRead="true"] {
  --dd-card-background-color: color-mix(in srgb, v('color.light-gray') 35%, #fff);;
  --dd-card-border-color: color-mix(in srgb, v('color.gray') 8%, v('color.light-gray'));
  --dd-card-color: v('color.gray');
  * {
    color: inherit;
  }
  
  :where(.badge) {
    --dd-badge-base-color: v('color.gray');
  }

  .iconWrap {
    background: v('color.light-gray');
    color: v('color.gray');
  }
}

[data-severity='danger']:is(:hover, :focus-within):not([data-isRead='true']) {
  --dd-card-border-color: v('color.danger.300');
  --dd-card-color: v('color.danger');
}

[data-severity='warning']:is(:hover, :focus-within):not([data-isRead='true']) {
  --dd-card-border-color: v('color.warning.300');
  --dd-card-color: v('color.warning');
}

[data-severity='info']:is(:hover, :focus-within):not([data-isRead='true']) {
  --dd-card-border-color: v('color.info.300');
  --dd-card-color: v('color.info');
}
</style>
