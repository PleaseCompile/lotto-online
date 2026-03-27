export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on server — let client-side handle auth redirects
  // (SSR cookie-based auth is unreliable on serverless platforms)
  if (import.meta.server) return

  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }
})
