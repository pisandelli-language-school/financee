type PostalCodeLookupState = 'idle' | 'loading' | 'success' | 'error'

type CepResponse = {
  cep?: string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

type PostalCodeAddress = {
  street: string
  district: string
  city: string
  state: string
  country: string
}

type UsePostalCodeLookupOptions = {
  onSuccess: (address: PostalCodeAddress) => void
  onNotFound?: () => void
  debounceMs?: number
}

export function usePostalCodeLookup(options: UsePostalCodeLookupOptions) {
  const state = ref<PostalCodeLookupState>('idle')
  const message = ref('')

  const lookup = useDebounceFn(async (postalCode: string) => {
    state.value = 'loading'
    message.value = 'Consultando CEP...'

    try {
      const response = await $fetch<CepResponse>(`https://viacep.com.br/ws/${postalCode}/json/`)

      if (response.erro) {
        state.value = 'error'
        message.value = 'CEP não encontrado.'
        options.onNotFound?.()
        return
      }

      state.value = 'success'
      message.value = 'Endereço preenchido automaticamente.'

      options.onSuccess({
        street: response.logradouro ?? '',
        district: response.bairro ?? '',
        city: response.localidade ?? '',
        state: response.uf ?? '',
        country: 'BRASIL',
      })
    } catch {
      state.value = 'error'
      message.value = 'Não foi possível consultar o CEP agora.'
    }
  }, options.debounceMs ?? 400)

  function reset() {
    state.value = 'idle'
    message.value = ''
  }

  return {
    state,
    message,
    lookup,
    reset,
  }
}
