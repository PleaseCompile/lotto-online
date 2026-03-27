export default defineNuxtRouteMiddleware(async () => {
  // Skip on server — let client-side handle admin check
  if (import.meta.server) return

  const { isAdmin, fetchProfile, profile } = useAuth()

  if (!profile.value) {
    await fetchProfile()
  }

  if (!isAdmin.value) {
    return navigateTo('/')
  }
})
