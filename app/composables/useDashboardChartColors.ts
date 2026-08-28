import { onBeforeUnmount, onMounted, ref } from 'vue'

const fallbackColors = {
  financialIncome: '#2e7d32',
  financialExpense: '#db0000',
  financialNet: '#0a51cf',
  delinquencyHigh: '#db0000',
  delinquencyMedium: '#b25e00',
  delinquencyLow: '#0277bd',
  text: '#171717',
  muted: '#737373',
  grid: '#e5e5e5',
}

const colorTokens = {
  financialIncome: '--dd-chart-financial-income',
  financialExpense: '--dd-chart-financial-expense',
  financialNet: '--dd-chart-financial-net',
  delinquencyHigh: '--dd-chart-delinquency-high',
  delinquencyMedium: '--dd-chart-delinquency-medium',
  delinquencyLow: '--dd-chart-delinquency-low',
  text: '--dd-chart-text',
  muted: '--dd-chart-muted',
  grid: '--dd-chart-grid',
} as const

export type DashboardChartColors = typeof fallbackColors

export function useDashboardChartColors() {
  const colors = ref<DashboardChartColors>({ ...fallbackColors })
  let observer: MutationObserver | undefined

  onMounted(() => {
    const updateColors = () => {
      const themeHost = document.querySelector<HTMLElement>('[data-theme]') ?? document.documentElement
      const probe = document.createElement('span')
      probe.hidden = true
      themeHost.append(probe)

      colors.value = Object.fromEntries(
        Object.entries(colorTokens).map(([key, token]) => {
          probe.style.color = `var(${token})`
          const resolvedColor = getComputedStyle(probe).color

          return [
            key,
            resolvedColor && !resolvedColor.startsWith('var(')
              ? resolvedColor
              : fallbackColors[key as keyof DashboardChartColors],
          ]
        }),
      ) as DashboardChartColors

      probe.remove()
    }

    updateColors()
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(updateColors)
      observer.observe(document.documentElement, {
        subtree: true,
        attributes: true,
        attributeFilter: ['data-theme'],
      })
    }
  })

  onBeforeUnmount(() => observer?.disconnect())

  return colors
}
