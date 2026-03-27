<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { requestOtp, verifyOtp, loading, error } = useAuth()

const step = ref<'phone' | 'otp'>('phone')
const phone = ref('')
const otp = ref('')
const route = useRoute()

const formattedPhone = computed(() => {
  // Ensure +66 format
  const cleaned = phone.value.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    return '+66' + cleaned.slice(1)
  }
  if (cleaned.startsWith('66')) {
    return '+' + cleaned
  }
  return '+66' + cleaned
})

const handleRequestOtp = async () => {
  if (!phone.value || phone.value.length < 9) return

  const success = await requestOtp(formattedPhone.value)
  if (success) {
    step.value = 'otp'
  }
}

const handleVerifyOtp = async () => {
  if (!otp.value || otp.value.length !== 6) return

  const success = await verifyOtp(formattedPhone.value, otp.value)
  if (success) {
    const redirect = (route.query.redirect as string) || '/'
    navigateTo(redirect)
  }
}

const handleOtpInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  target.value = target.value.replace(/\D/g, '').slice(0, 6)
  otp.value = target.value
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
          กรอกเบอร์โทรศัพท์เพื่อรับรหัส OTP
        </p>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
        <div class="flex items-center gap-2">
          <Icon name="ph:warning-circle" />
          {{ error }}
        </div>
      </div>

      <!-- Step 1: Phone -->
      <form v-if="step === 'phone'" @submit.prevent="handleRequestOtp" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">เบอร์โทรศัพท์</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm">+66</span>
            <input
              v-model="phone"
              type="tel"
              class="input !pl-12"
              placeholder="812345678"
              maxlength="10"
              inputmode="numeric"
              autofocus
            />
          </div>
        </div>
        <UiButton
          variant="primary"
          size="lg"
          :loading="loading"
          class="w-full"
          :disabled="!phone || phone.length < 9"
        >
          ขอรหัส OTP
        </UiButton>
      </form>

      <!-- Step 2: OTP -->
      <form v-else @submit.prevent="handleVerifyOtp" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">รหัส OTP (6 หลัก)</label>
          <input
            :value="otp"
            type="text"
            class="input text-center text-2xl font-mono tracking-[0.5em]"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            autofocus
            @input="handleOtpInput"
          />
          <p class="text-xs text-[var(--color-text-muted)] mt-1.5">
            ส่งรหัสไปที่ {{ formattedPhone }}
          </p>
        </div>
        <UiButton
          variant="primary"
          size="lg"
          :loading="loading"
          class="w-full"
          :disabled="otp.length !== 6"
        >
          ยืนยัน OTP
        </UiButton>
        <button
          type="button"
          class="w-full text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors"
          @click="step = 'phone'; otp = ''; error = null"
        >
          เปลี่ยนเบอร์โทรศัพท์
        </button>
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
