<script setup lang="ts">
definePageMeta({
  layout: false,
})

const user = useSupabaseUser()
const loading = ref(true)
const error = ref(false)

// The @nuxtjs/supabase module automatically handles the token exchange
// when the user arrives at this callback URL with the auth code.
// We just wait for the user to be set, then redirect.
watch(user, (val) => {
  if (val) {
    navigateTo('/')
  }
}, { immediate: true })

onMounted(() => {
  // Give Supabase time to process the token
  setTimeout(() => {
    if (!user.value) {
      error.value = true
    }
    loading.value = false
  }, 5000)
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface-alt dark:bg-surface-dark p-4">
    <div class="w-full max-w-sm text-center">
      <div v-if="loading" class="space-y-4">
        <Icon name="ph:spinner" class="text-5xl text-primary animate-spin" />
        <p class="text-lg font-medium">กำลังยืนยันอีเมล...</p>
        <p class="text-sm text-[var(--color-text-muted)]">กรุณารอสักครู่</p>
      </div>

      <div v-else-if="error" class="space-y-4">
        <div class="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
          <Icon name="ph:warning-circle-fill" class="text-3xl text-danger" />
        </div>
        <p class="text-lg font-medium">ยืนยันอีเมลไม่สำเร็จ</p>
        <p class="text-sm text-[var(--color-text-muted)]">ลิงก์อาจหมดอายุ กรุณาลองสมัครใหม่</p>
        <NuxtLink to="/login" class="btn-primary mt-4 inline-flex">
          ไปหน้าเข้าสู่ระบบ
        </NuxtLink>
      </div>

      <div v-else class="space-y-4">
        <div class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <Icon name="ph:check-circle-fill" class="text-3xl text-success" />
        </div>
        <p class="text-lg font-medium">ยืนยันอีเมลสำเร็จ!</p>
        <p class="text-sm text-[var(--color-text-muted)]">กำลังพาคุณไปหน้าหลัก...</p>
      </div>
    </div>
  </div>
</template>
