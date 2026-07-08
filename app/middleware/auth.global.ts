// Global auth gate. Supabase built-in redirect is disabled (nuxt.config), so route
// protection lives here. Authenticated data access is enforced server-side (RBAC + RLS);
// this middleware only controls navigation.

// Move public routes outside to prevent reallocation on every route change and use a Set for O(1) lookups
const publicRoutes = new Set(['/login', '/confirm', '/acesso-negado'])

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  if (user.value) {
    // Authenticated → keep them out of the login/landing entry points.
    if (to.path === '/login' || to.path === '/') {
      return navigateTo('/configuracoes')
    }
  } else {
    // Unauthenticated → only public routes allowed.
    if (!publicRoutes.has(to.path)) {
      return navigateTo('/login')
    }
  }
})
