// Financee — Nuxt 4 config.
// Baseline (MAWA): @nuxt/eslint, @vueuse/nuxt, @pinia/nuxt.
// Tier 2: @nuxtjs/supabase (auth/session), nuxt-echarts (dashboards), DareDash (UI).
// DareDash auto-registers @nuxt/icon, @nuxt/fonts and @vee-validate/nuxt.
//
// Layer imports use Nuxt's native alias `@/` (→ srcDir `app/`).
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  modules: [
    '@nuxt/eslint',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/supabase',
    'nuxt-echarts',
    '@pisandelli/daredash'
  ],

  eslint: {},

  typescript: {
    strict: true,
    tsConfig: {
      vueCompilerOptions: {
        plugins: [
          '@vue/language-plugin-pug',
        ],
      },
    },
  },

  pinia: {
    storesDirs: ['./app/stores/**', './stores/**'],
  },

  // Auth via Google Workspace (Supabase). Route protection is handled manually in
  // app/middleware/auth.global.ts (redirect: false). The browser Supabase client is used
  // for auth/session only; application data lives in MySQL and is accessed server-side
  // via Prisma, where RBAC is enforced.
  supabase: {
    redirect: false,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
    },
    types: false,
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
  },

  vite: {
    optimizeDeps: {
      include: [
        '@nuxtjs/supabase > @supabase/ssr > cookie', // CJS
        '@supabase/supabase-js',
        '@vee-validate/zod',
        'zod',
      ],
    },
  },
})
