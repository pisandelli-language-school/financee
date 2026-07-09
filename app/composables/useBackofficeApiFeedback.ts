import type { DeleteBlockReason } from '~/types/backoffice'

interface ApiErrorData {
  title?: string
  description?: string
  message?: string
}

interface ApiLikeError {
  data?: ApiErrorData
  statusMessage?: string
  message?: string
}

export function useBackofficeApiFeedback() {
  function getErrorMessage(error: unknown, fallback: string) {
    const resolved = error as ApiLikeError
    return resolved?.data?.message || resolved?.statusMessage || resolved?.message || fallback
  }

  function getDeleteBlockReason(error: unknown): DeleteBlockReason | null {
    const resolved = error as ApiLikeError

    if (resolved?.statusMessage !== 'DEPENDENCY_BLOCKED') {
      return null
    }

    return {
      title: resolved.data?.title || 'Exclusao bloqueada',
      description: resolved.data?.description || 'Existem dependencias vinculadas a este registro.',
    }
  }

  return {
    getDeleteBlockReason,
    getErrorMessage,
  }
}
