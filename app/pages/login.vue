<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { signIn, loading, error } = useAuth()
const route = useRoute()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const canSubmit = computed(() => {
  return email.value.trim().length > 0 && password.value.length >= 8
})

const handleLogin = async () => {
  if (!canSubmit.value) return

  const data = await signIn(email.value.trim(), password.value)
  if (data) {
    const redirect = (route.query.redirect as string) || '/'
    navigateTo(redirect)
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface-alt dark:bg-surface-dark p-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <NuxtLink to="/" class="inline-flex items-center gap-2">
          <Icon name="ph:clover-fill" class="text-primary text-4xl" />
        </NuxtLink>
        <h1 class="text-2xl font-bold mt-4">เข้าสู่ระบบ</h1>
        <p class="text-sm text-[var(--color-text-muted)] mt-1">
          กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ
        </p>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
        <div class="flex items-center gap-2">
          <Icon name="ph:warning-circle" class="shrink-0" />
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">อีเมล</label>
          <div class="relative">
            <Icon name="ph:envelope-simple" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              v-model="email"
              type="email"
              class="input !pl-10"
              placeholder="example@email.com"
              autocomplete="email"
              autofocus
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">รหัสผ่าน</label>
          <div class="relative">
            <Icon name="ph:lock-simple" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="input !pl-10 !pr-10"
              placeholder="รหัสผ่าน"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              @click="showPassword = !showPassword"
            >
              <Icon :name="showPassword ? 'ph:eye-slash' : 'ph:eye'" />
            </button>
          </div>
        </div>

        <UiButton
          variant="primary"
          size="lg"
          :loading="loading"
          class="w-full"
          :disabled="!canSubmit"
        >
          <Icon name="ph:sign-in" />
          เข้าสู่ระบบ
        </UiButton>
      </form>

      <!-- Register Link -->
      <p class="text-center text-sm text-[var(--color-text-muted)] mt-6">
        ยังไม่มีบัญชี?
        <NuxtLink to="/register" class="text-primary hover:underline font-medium">
          สมัครสมาชิก
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
