export default defineNuxtRouteMiddleware(async () => {
  const { isAdmin, fetchProfile, profile } = useAuth()

  if (!profile.value) {
    await fetchProfile()
  }

  if (!isAdmin.value) {
    return navigateTo('/')
  }
})
