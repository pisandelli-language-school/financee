<script setup lang="ts">
import { FinancialEntriesModule } from '~/api/financial'
import type { FinancialEntryRecord } from '~/types/financial'

const props = defineProps<{
  open: boolean
  entry: FinancialEntryRecord | null
  accountOptions: Array<{ label: string; value: string }>
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'saved', value: FinancialEntryRecord): void
}>()

const { showToast } = useToaster()
const { getErrorMessage } = useBackofficeApiFeedback()

const loading = ref(false)
const errorMessage = ref('')
const paymentDate = ref('')
const paymentAccountId = ref('')

watch(() => props.open, (open) => {
  if (!open) {
    return
  }

  paymentDate.value = new Date().toISOString().slice(0, 10)
  paymentAccountId.value = props.entry?.accountId ?? ''
  errorMessage.value = ''
})

async function submit() {
  if (!props.entry) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const record = await FinancialEntriesModule.markAsPaid(props.entry.id, {
      paymentDate: paymentDate.value,
      paymentAccountId: paymentAccountId.value,
    })

    showToast('Lançamento marcado como pago.', {
      title: 'Lançamentos',
      type: 'success',
    })
    emit('saved', record)
    emit('update:open', false)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Não foi possível marcar o lançamento como pago.')
  } finally {
    loading.value = false
  }
}
</script>

<template lang="pug">
backoffice-modal-form-shell(
  :open="open"
  title="Marcar como pago"
  :loading="loading"
  :error-message="errorMessage"
  :class="fin.modal"
  error-title="Lançamentos"
  save-label="Confirmar pagamento"
  save-icon="lucide:check"
  @update:open="$emit('update:open', $event)"
  @submit="submit"
)
  dd-card(tag="article" noborder flat)
    dd-stack(compact)
      dd-stack(compact nogap)
        strong {{ entry?.description }}
        span(:class="fin.hint") Confirme a data e a conta em que o pagamento foi efetivado.

      dd-grid
        dd-input(
          :model-value="paymentDate"
          label="Data de pagamento"
          required
          type="date"
          @update:model-value="paymentDate = String($event)"
        )

        dd-select(
          :model-value="paymentAccountId"
          label="Conta de pagamento"
          required
          placeholder="Selecione"
          :options="accountOptions"
          @update:model-value="paymentAccountId = String($event)"
        )
</template>

<style module="fin">
.modal {
  --dd-modal-inline-size: min(36rem, calc(100vw - 2rem));
  --dd-modal-max-inline-size: min(36rem, calc(100vw - 2rem));
}

.hint {
  color: v('color.text.soft');
}
</style>
