// Global auth gate. Supabase built-in redirect is disabled (nuxt.config), so route
// protection lives here. Authenticated data access is enforced server-side via Prisma
// and RBAC; this middleware only controls navigation.
const publicRoutes = new Set(['/login', '/confirm', '/acesso-negado'])

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // Unauthenticated → only public routes allowed.
  if (!user.value) {
    if (!publicRoutes.has(to.path)) {
      return navigateTo('/login')
    }

    return
  }

  // Authenticated → keep them out of the login/landing entry points.
  if (to.path === '/login' || to.path === '/') {
    return navigateTo('/configuracoes')
  }
})
