<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title: string
  loading?: boolean
  errorMessage?: string
  errorTitle?: string
  saveLabel?: string
  saveIcon?: string
}>(), {
  errorTitle: 'Cadastro',
  errorMessage: '',
  saveLabel: 'Salvar',
  saveIcon: 'lucide:save',
})

defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'submit'): void
}>()

</script>

<template lang="pug">
dd-modal(
  :open="open"
  :title="title"
  @update:open="$emit('update:open', $event)"
)
  form(:class="fin.form" @submit.prevent="$emit('submit')")
    dd-stack(compact)
      dd-alert(
        v-if="errorMessage"
        danger
        :title="errorTitle"
        :closable="false"
        icon
      ) {{ errorMessage }}

      slot

  template(#footer)
    slot(name="footer")
      dd-cluster(end)
        dd-button(outline type="button" @click="$emit('update:open', false)") Cancelar
        dd-button(
          primary
          type="button"
          :disabled="loading"
          :icon="saveIcon"
          @click="$emit('submit')"
        ) {{ saveLabel }}
</template>

<style module="fin">
.form {
  display: contents;
}
</style>
