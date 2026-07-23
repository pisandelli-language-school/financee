import bancoDoBrasilLogo from '~/assets/images/logo-banco-do-brasil.png'
import bradescoLogo from '~/assets/images/logo-bradesco.png'
import caixaLogo from '~/assets/images/logo-caixa.png'
import interLogo from '~/assets/images/logo-inter.png'
import itauLogo from '~/assets/images/logo-itau.png'
import nubankLogo from '~/assets/images/logo-nubank.png'
import pagbankLogo from '~/assets/images/logo-pagbank.png'
import santanderLogo from '~/assets/images/logo-santander.png'

export const financialInstitutionSeedCatalog = [
  { code: 'banco-do-brasil', name: 'Banco do Brasil', logoKey: 'banco-do-brasil', logoSrc: bancoDoBrasilLogo },
  { code: 'bradesco', name: 'Bradesco', logoKey: 'bradesco', logoSrc: bradescoLogo },
  { code: 'caixa', name: 'Caixa Econômica', logoKey: 'caixa', logoSrc: caixaLogo },
  { code: 'inter', name: 'Banco Inter', logoKey: 'inter', logoSrc: interLogo },
  { code: 'itau', name: 'Itaú', logoKey: 'itau', logoSrc: itauLogo },
  { code: 'nubank', name: 'Nubank', logoKey: 'nubank', logoSrc: nubankLogo },
  { code: 'pagbank', name: 'PagBank', logoKey: 'pagbank', logoSrc: pagbankLogo },
  { code: 'santander', name: 'Santander', logoKey: 'santander', logoSrc: santanderLogo },
] as const

export function getInstitutionLogoByKey(logoKey: string | null | undefined) {
  if (!logoKey) {
    return ''
  }

  return financialInstitutionSeedCatalog.find(item => item.logoKey === logoKey)?.logoSrc ?? ''
}

export function getAccountInitials(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return 'CC'
  }

  const parts = normalized.split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('')

  return initials || normalized.slice(0, 2).toUpperCase()
}
