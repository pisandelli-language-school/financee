import { PaymentMethodModule } from '~~/app/api/backoffice'
import { createCrudStore } from './_createCrudStore'

export const usePaymentMethodsStore = createCrudStore(
  'paymentMethods',
  PaymentMethodModule,
  () => ({
    search: '',
    page: 1,
    pageSize: 50,
  }),
)
