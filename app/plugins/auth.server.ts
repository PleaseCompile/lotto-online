export default defineNuxtPlugin(async () => {
  const user = useSupabaseUser()
  const { fetchProfile, profile } = useAuth()

  // Fetch profile on initial load if user is already authenticated
  if (user.value && !profile.value) {
    await fetchProfile()
  }
})
