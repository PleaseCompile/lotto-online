<script setup lang="ts">
definePageMeta({
  layout: false,
})

const supabase = useSupabaseClient()
const { loading, error } = useAuth()

const step = ref<'info' | 'phone' | 'otp'>('info')
const form = reactive({
  full_name: '',
  phone: '',
  otp: '',
})

const formattedPhone = computed(() => {
  const cleaned = form.phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) return '+66' + cleaned.slice(1)
  if (cleaned.startsWith('66')) return '+' + cleaned
  return '+66' + cleaned
})

const handleInfoSubmit = () => {
  if (!form.full_name.trim()) return
  step.value = 'phone'
}

const handleRequestOtp = async () => {
  if (!form.phone || form.phone.length < 9) return

  loading.value = true
  error.value = null

  try {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: formattedPhone.value,
      options: {
        data: {
          full_name: form.full_name,
        },
      },
    })

    if (otpError) {
      error.value = otpError.message
      return
    }

    step.value = 'otp'
  } catch {
    error.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    loading.value = false
  }
}

const handleVerifyOtp = async () => {
  if (form.otp.length !== 6) return

  loading.value = true
  error.value = null

  try {
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: formattedPhone.value,
      token: form.otp,
      type: 'sms',
    })

    if (verifyError) {
      error.value = verifyError.message
      return
    }

    // Create user profile
    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        phone: formattedPhone.value,
        full_name: form.full_name,
      }, { onConflict: 'id' })
    }

    navigateTo('/')
  } catch {
    error.value = 'รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่'
  } finally {
    loading.value = false
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

      <!-- Progress -->
      <div class="flex items-center justify-center gap-2 mb-6">
        <div
          v-for="(s, i) in ['info', 'phone', 'otp']"
          :key="s"
          class="flex items-center gap-2"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
            :class="step === s ? 'bg-primary text-secondary-dark' : i < ['info', 'phone', 'otp'].indexOf(step) ? 'bg-success text-white' : 'bg-surface dark:bg-surface-dark-alt text-[var(--color-text-muted)] border border-border dark:border-border-dark'"
          >
            <Icon v-if="i < ['info', 'phone', 'otp'].indexOf(step)" name="ph:check-bold" class="text-xs" />
            <span v-else>{{ i + 1 }}</span>
          </div>
          <div v-if="i < 2" class="w-8 h-0.5 bg-border dark:bg-border-dark" />
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
        <div class="flex items-center gap-2">
          <Icon name="ph:warning-circle" />
          {{ error }}
        </div>
      </div>

      <!-- Step 1: Name -->
      <form v-if="step === 'info'" @submit.prevent="handleInfoSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">ชื่อ-นามสกุล</label>
          <input
            v-model="form.full_name"
            type="text"
            class="input"
            placeholder="สมชาย ใจดี"
            autofocus
          />
        </div>
        <UiButton
          variant="primary"
          size="lg"
          class="w-full"
          :disabled="!form.full_name.trim()"
        >
          ถัดไป
        </UiButton>
      </form>

      <!-- Step 2: Phone -->
      <form v-else-if="step === 'phone'" @submit.prevent="handleRequestOtp" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">เบอร์โทรศัพท์</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm">+66</span>
            <input
              v-model="form.phone"
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
          :disabled="!form.phone || form.phone.length < 9"
        >
          ขอรหัส OTP
        </UiButton>
        <button
          type="button"
          class="w-full text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors"
          @click="step = 'info'"
        >
          ย้อนกลับ
        </button>
      </form>

      <!-- Step 3: OTP -->
      <form v-else @submit.prevent="handleVerifyOtp" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">รหัส OTP (6 หลัก)</label>
          <input
            v-model="form.otp"
            type="text"
            class="input text-center text-2xl font-mono tracking-[0.5em]"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            autofocus
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
          :disabled="form.otp.length !== 6"
        >
          ยืนยัน OTP
        </UiButton>
        <button
          type="button"
          class="w-full text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors"
          @click="step = 'phone'; form.otp = ''"
        >
          เปลี่ยนเบอร์โทรศัพท์
        </button>
      </form>

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
