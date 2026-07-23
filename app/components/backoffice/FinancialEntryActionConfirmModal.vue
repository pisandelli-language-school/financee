<script setup lang="ts">
import {
  recurrenceEditScopeOptions,
  type FinancialEntryRecord,
  type RecurrenceEditScope,
} from '~/types/financial'

type FinancialEntryAction = 'reopen' | 'cancel' | 'delete'

const props = defineProps<{
  open: boolean
  entry: FinancialEntryRecord | null
  action: FinancialEntryAction | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'confirm', value: RecurrenceEditScope): void
}>()

const selectedScope = ref<RecurrenceEditScope>('ONLY_THIS')

const actionConfig = computed(() => {
  if (props.action === 'reopen') {
    return {
      title: 'Reabrir lançamento',
      description: `Deseja reabrir o lançamento "${props.entry?.description ?? ''}"?`,
      confirmLabel: 'Reabrir lançamento',
      icon: 'lucide:rotate-ccw',
      tone: 'warning' as const,
      scopeLabel: 'Como deseja reabrir?',
    }
  }

  if (props.action === 'cancel') {
    return {
      title: 'Cancelar lançamento',
      description: `Deseja cancelar o lançamento "${props.entry?.description ?? ''}"?`,
      confirmLabel: 'Cancelar lançamento',
      icon: 'lucide:x',
      tone: 'danger' as const,
      scopeLabel: 'Como deseja cancelar?',
    }
  }

  return {
    title: 'Excluir lançamento',
    description: `Deseja excluir o lançamento "${props.entry?.description ?? ''}"? Esta ação remove o registro da listagem, mas não deve ser usada para baixa financeira.`,
    confirmLabel: 'Excluir lançamento',
    icon: 'lucide:trash-2',
    tone: 'danger' as const,
    scopeLabel: '',
  }
})

const showScopeOptions = computed(() =>
  props.action !== 'delete'
  && Boolean(props.entry?.recurrenceGroupId),
)

watch(() => props.open, (open) => {
  if (open) {
    selectedScope.value = 'ONLY_THIS'
  }
})

function confirmAction() {
  emit('confirm', showScopeOptions.value ? selectedScope.value : 'ONLY_THIS')
}
</script>

<template lang="pug">
dd-modal(
  :open="open"
  :title="actionConfig.title"
  @update:open="$emit('update:open', $event)"
)
  dd-stack(compact)
    p(:class="fin.description") {{ actionConfig.description }}

    dd-stack(v-if="showScopeOptions" compact)
      dd-form-label {{ actionConfig.scopeLabel }}
      dd-stack(compact)
        dd-radio(
          v-for="option in recurrenceEditScopeOptions"
          :key="option.value"
          v-model="selectedScope"
          name="financial-entry-action-scope"
          :value="option.value"
          :label="option.label"
        )

  template(#footer)
    dd-cluster(end)
      dd-button(outline @click="$emit('update:open', false)") Cancelar
      dd-button(
        :warning="actionConfig.tone === 'warning'"
        :danger="actionConfig.tone === 'danger'"
        :disabled="loading"
        :icon="actionConfig.icon"
        @click="confirmAction"
      ) {{ actionConfig.confirmLabel }}
</template>

<style module="fin">
.description {
  color: v('color.text.soft');
  margin: 0;
}
</style>
