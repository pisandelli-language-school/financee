<script setup lang="ts">
import type { AccountRecord } from '~/types/backoffice'
import { getAccountInitials, getInstitutionLogoByKey } from '~/utils/account-institutions'

const props = defineProps<{
  account: AccountRecord
}>()

defineEmits<{
  (event: 'edit' | 'delete', account: AccountRecord): void
}>()

const logoSrc = computed(() => getInstitutionLogoByKey(props.account.institutionLogoKey))
const balanceLabel = computed(() => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(props.account.initialValue ?? 0))
const subtitle = computed(() => props.account.institutionName ?? props.account.type)
const initials = computed(() => getAccountInitials(props.account.institutionName || props.account.name))
</script>

<template lang="pug">
dd-card(:class="fin.card")
  dd-stack(compact :class="fin.content")
    dd-cluster(compact :class="fin.header")
      dd-avatar(
        v-if="logoSrc"
        :class="fin.avatar"
        :src="logoSrc"
        :alt="account.institutionName || account.name"
      )
      span(v-else :class="fin.initials") {{ initials }}
      dd-stack(compact nogap :class="fin.text")
        strong(:class="fin.name") {{ account.name }}
        span(:class="fin.subtitle") {{ subtitle }}

    dd-stack(compact nogap)
      span(:class="fin.balanceLabel") Saldo inicial
      strong(:class="fin.balance") {{ balanceLabel }}

    dd-cluster(compact :class="fin.actions")
      dd-button(
        outline
        small
        icon="lucide:pencil"
        :class="fin.actionButton"
        type="button"
        @click="$emit('edit', account)"
      ) Editar
      dd-button(
        ghost
        small
        danger
        icon="lucide:trash-2"
        :class="fin.actionButton"
        type="button"
        @click="$emit('delete', account)"
      ) Excluir
</template>

<style module="fin">
.card {
  --dd-card-body-padding: v('space.lg');
  --dd-card-border-radius: v('border-radius.lg');
  block-size: 100%;
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;

  &:is(:hover, :focus-within) {
    --dd-card-border-color: v('color.primary.200');
    --dd-card-box-shadow: v('shadow.xl');

    transform: translateY(-1px);
  }
}

.content {
  block-size: 100%;
  gap: v('space.md');
  justify-content: space-between;
}

.header {
  align-items: center;
  flex-wrap: nowrap;
  gap: v('space.md');
}

.text {
  min-inline-size: 0;
}

.avatar {
  --dd-avatar-background-color: transparent;

  flex: 0 0 3.25rem;
}

.name {
  font-size: var(--dd-font-size-base);
  font-weight: v('font-weight.semi-bold');
  line-height: v('line-height.tight');
}

.subtitle,
.balanceLabel {
  color: var(--dd-color-gray);
  font-size: v('font-size.sm');
}

.balance {
  font-size: var(--dd-font-size-lg);
  line-height: v('line-height.tight');
}

.actions {
  margin-block-start: auto;
  gap: v('space.xs');
}

.actionButton {
  --dd-button-border-radius: v('border-radius.md');
}

.initials {
  align-items: center;
  background: v('color.primary');
  border-radius: 999px;
  color: v('color.text.inverted');
  display: inline-flex;
  flex: 0 0 3.25rem;
  font-size: v('font-size.sm');
  font-weight: v('font-weight.semi-bold');
  inline-size: 3.25rem;
  justify-content: center;
  text-transform: uppercase;
}
</style>
