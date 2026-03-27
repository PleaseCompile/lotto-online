export default defineNuxtPlugin(() => {
  // Profile fetching is handled client-side by the auth/admin middleware
  // SSR auth state from @nuxtjs/supabase is unreliable on serverless platforms
})
