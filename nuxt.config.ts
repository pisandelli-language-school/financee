// Financee — Nuxt 4 config.
// Baseline (MAWA): @nuxt/eslint, @vueuse/nuxt, @pinia/nuxt.
// Tier 2: @nuxtjs/supabase (auth/session), nuxt-echarts (dashboards), DareDash (UI).
// DareDash auto-registers @nuxt/icon, @nuxt/fonts and @vee-validate/nuxt.
//
// Layer imports use Nuxt's native alias `@/` (→ srcDir `app/`).
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/supabase',
    'nuxt-echarts',
    [
      '@pisandelli/daredash',
      {
        prefix: 'dd',
        debug: false,
      },
    ],
  ],

  eslint: {},

  typescript: {
    strict: true,
  },

  pinia: {
    storesDirs: ['./app/stores/**'],
  },

  // Auth via Google Workspace (Supabase). Route protection is handled manually in
  // app/middleware/auth.global.ts (redirect: false). The browser Supabase client is used
  // for auth/session only; data access is server-side via Prisma. Tables use RLS
  // (deny-by-default).
  supabase: {
    redirect: false,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
    },
    types: false,
  },

  vite: {
    optimizeDeps: {
      include: ['@supabase/supabase-js', '@nuxtjs/supabase > @supabase/ssr > cookie'],
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      }
    }
  },
})
