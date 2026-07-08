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
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://accounts.google.com; frame-src 'self' https://accounts.google.com;",
      },
    },
  },
})
