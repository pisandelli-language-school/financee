// Global auth gate. Supabase built-in redirect is disabled (nuxt.config), so route
// protection lives here. Authenticated data access is enforced server-side (RBAC + RLS);
// this middleware only controls navigation.
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  const publicRoutes = ['/login', '/confirm', '/acesso-negado']

  // Unauthenticated → only public routes allowed.
  if (!user.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }

  // Authenticated → keep them out of the login/landing entry points.
  if (user.value && (to.path === '/login' || to.path === '/')) {
    return navigateTo('/configuracoes')
  }
})
