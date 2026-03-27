/**
 * Returns reactive user ID compatible with @nuxtjs/supabase v2+
 * v2+ uses getClaims() which returns JWT 'sub' instead of 'id'
 */
export const useUserId = () => {
  const user = useSupabaseUser()
  return computed(() => (user.value as any)?.sub ?? (user.value as any)?.id ?? null)
}
