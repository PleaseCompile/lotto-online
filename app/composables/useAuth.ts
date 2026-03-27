import type { User } from '~/types/database'

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const profile = useState<User | null>('user-profile', () => null)

  const signUp = async (email: string, password: string, fullName: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/confirm`,
        },
      })

      if (signUpError) {
        error.value = signUpError.message
        return null
      }

      // Create user profile in public.users
      if (data.user) {
        await supabase.from('users').upsert({
          id: data.user.id,
          email,
          full_name: fullName,
        }, { onConflict: 'id' })
      }

      return data
    } catch (e) {
      error.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      return null
    } finally {
      loading.value = false
    }
  }

  const signIn = async (email: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        error.value = signInError.message
        return null
      }

      // Fetch user profile after successful sign in
      await fetchProfile()

      return data
    } catch (e) {
      error.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchProfile = async () => {
    if (!user.value) return null

    try {
      const data = await $fetch<User>('/api/me')
      profile.value = data
      return profile.value
    } catch {
      profile.value = null
      return null
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    profile.value = null
    navigateTo('/login')
  }

  const isAdmin = computed(() => {
    return profile.value?.role === 'admin' || profile.value?.role === 'super_admin'
  })

  return {
    user,
    profile,
    loading,
    error,
    isAdmin,
    signUp,
    signIn,
    fetchProfile,
    signOut,
  }
}
