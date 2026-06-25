// Financee Vitest config. Uses the Nuxt test environment so store/component tests get
// Nuxt auto-imports (ref, computed, useAsyncData, ...) and the `@/` alias.
// Requires (dev deps): @nuxt/test-utils, vitest@^3 (Nuxt 4 needs Vitest 3+), happy-dom.
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
  },
})
