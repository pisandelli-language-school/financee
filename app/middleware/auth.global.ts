// Global auth gate. Supabase built-in redirect is disabled (nuxt.config), so route
// protection lives here. Authenticated data access is enforced server-side (RBAC + RLS);
// this middleware only controls navigation.

// Optimized: using a Set outside the middleware prevents array reallocation on every
// route transition and provides O(1) lookup performance.
const publicRoutes = new Set(['/login', '/confirm', '/acesso-negado'])

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // Unauthenticated → only public routes allowed.
  if (!user.value) {
    if (!publicRoutes.has(to.path)) {
      return navigateTo('/login')
    }
    return // Early return avoids unnecessary checks
  }

  // Authenticated → keep them out of the login/landing entry points.
  if (to.path === '/login' || to.path === '/') {
    return navigateTo('/configuracoes')
  }
})
