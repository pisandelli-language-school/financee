// Global auth gate. Supabase built-in redirect is disabled (nuxt.config), so route
// protection lives here. Authenticated data access is enforced server-side (RBAC + RLS);
// this middleware only controls navigation.

// Bolt: Hoist and use Set for O(1) lookups to prevent array allocation on every route transition
const publicRoutes = new Set(['/login', '/confirm', '/acesso-negado'])

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // Unauthenticated → only public routes allowed.
  if (!user.value && !publicRoutes.has(to.path)) {
    return navigateTo('/login')
  }

  // Authenticated → keep them out of the login/landing entry points.
  if (user.value && (to.path === '/login' || to.path === '/')) {
    return navigateTo('/configuracoes')
  }
})
