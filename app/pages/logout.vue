<script setup lang="ts">
const supabase = useSupabaseClient()

const signOut = async () => {
  await supabase.auth.signOut()
  navigateTo('/login')
}

onMounted(() => {
  signOut()
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <Icon name="ph:spinner" class="text-4xl text-primary animate-spin" />
      <p class="mt-3 text-sm text-[var(--color-text-muted)]">กำลังออกจากระบบ...</p>
    </div>
  </div>
</template>
