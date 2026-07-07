// Global auth gate. Supabase built-in redirect is disabled (nuxt.config), so route
// protection lives here. Authenticated data access is enforced server-side (RBAC + RLS);
// this middleware only controls navigation.
const PUBLIC_ROUTES = new Set(['/login', '/confirm', '/acesso-negado'])
const ENTRY_ROUTES = new Set(['/login', '/'])

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // Unauthenticated → only public routes allowed.
  if (!user.value && !PUBLIC_ROUTES.has(to.path)) {
    return navigateTo('/login')
  }

  // Authenticated → keep them out of the login/landing entry points.
  if (user.value && ENTRY_ROUTES.has(to.path)) {
    return navigateTo('/configuracoes')
  }
})
