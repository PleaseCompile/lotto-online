<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { signUp, loading, error } = useAuth()

const form = reactive({
  full_name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const showPassword = ref(false)
const success = ref(false)

const passwordMismatch = computed(() => {
  return form.confirmPassword.length > 0 && form.password !== form.confirmPassword
})

const canSubmit = computed(() => {
  return form.full_name.trim().length > 0
    && form.email.trim().length > 0
    && form.password.length >= 6
    && form.password === form.confirmPassword
})

const handleRegister = async () => {
  if (!canSubmit.value) return

  const data = await signUp(form.email.trim(), form.password, form.full_name.trim())

  if (data) {
    // If email confirmation is required
    if (data.user && !data.session) {
      success.value = true
    } else {
      navigateTo('/')
    }
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
        <h1 class="text-2xl font-bold mt-4">สมัครสมาชิก</h1>
        <p class="text-sm text-[var(--color-text-muted)] mt-1">
          สร้างบัญชีเพื่อซื้อลอตเตอรี่ออนไลน์
        </p>
      </div>

      <!-- Success (email confirmation) -->
      <div v-if="success" class="card p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <Icon name="ph:envelope-simple-fill" class="text-3xl text-success" />
        </div>
        <h2 class="font-semibold text-lg">ลงทะเบียนสำเร็จ!</h2>
        <p class="text-sm text-[var(--color-text-muted)] leading-relaxed">
          เราส่งลิงก์ยืนยันไปที่ <strong class="text-[var(--color-text)]">{{ form.email }}</strong> กรุณาตรวจสอบอีเมลของคุณ
        </p>
        <NuxtLink to="/login" class="btn-primary w-full mt-2">
          ไปหน้าเข้าสู่ระบบ
        </NuxtLink>
      </div>

      <template v-else>
        <!-- Error -->
        <div v-if="error" class="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
          <div class="flex items-center gap-2">
            <Icon name="ph:warning-circle" class="shrink-0" />
            <span>{{ error }}</span>
          </div>
        </div>

        <!-- Register Form -->
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">ชื่อ-นามสกุล</label>
            <div class="relative">
              <Icon name="ph:user" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                v-model="form.full_name"
                type="text"
                class="input !pl-10"
                placeholder="สมชาย ใจดี"
                autocomplete="name"
                autofocus
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">อีเมล</label>
            <div class="relative">
              <Icon name="ph:envelope-simple" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                v-model="form.email"
                type="email"
                class="input !pl-10"
                placeholder="example@email.com"
                autocomplete="email"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">รหัสผ่าน</label>
            <div class="relative">
              <Icon name="ph:lock-simple" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="input !pl-10 !pr-10"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                @click="showPassword = !showPassword"
              >
                <Icon :name="showPassword ? 'ph:eye-slash' : 'ph:eye'" />
              </button>
            </div>
            <p v-if="form.password.length > 0 && form.password.length < 6" class="text-xs text-warning mt-1">
              รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">ยืนยันรหัสผ่าน</label>
            <div class="relative">
              <Icon name="ph:lock-simple" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                v-model="form.confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                class="input !pl-10"
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                autocomplete="new-password"
              />
            </div>
            <p v-if="passwordMismatch" class="text-xs text-danger mt-1">
              รหัสผ่านไม่ตรงกัน
            </p>
          </div>

          <UiButton
            variant="primary"
            size="lg"
            :loading="loading"
            class="w-full"
            :disabled="!canSubmit"
          >
            <Icon name="ph:user-plus" />
            สมัครสมาชิก
          </UiButton>
        </form>
      </template>

      <!-- Login Link -->
      <p class="text-center text-sm text-[var(--color-text-muted)] mt-6">
        มีบัญชีอยู่แล้ว?
        <NuxtLink to="/login" class="text-primary hover:underline font-medium">
          เข้าสู่ระบบ
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
