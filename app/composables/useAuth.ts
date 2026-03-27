import type { User } from '~/types/database'

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const profile = useState<User | null>('user-profile', () => null)

  const requestOtp = async (phone: string) => {
    loading.value = true
    error.value = null

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone,
      })

      if (otpError) {
        error.value = otpError.message
        return false
      }

      return true
    } catch (e) {
      error.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      return false
    } finally {
      loading.value = false
    }
  }

  const verifyOtp = async (phone: string, token: string) => {
    loading.value = true
    error.value = null

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      })

      if (verifyError) {
        error.value = verifyError.message
        return false
      }

      return true
    } catch (e) {
      error.value = 'รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่'
      return false
    } finally {
      loading.value = false
    }
  }

  const fetchProfile = async () => {
    if (!user.value) return null

    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.value.id)
        .single()

      profile.value = data as User | null
      return profile.value
    } catch {
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
    requestOtp,
    verifyOtp,
    fetchProfile,
    signOut,
  }
}
