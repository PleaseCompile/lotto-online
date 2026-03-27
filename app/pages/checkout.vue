<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

useSeoMeta({ title: 'ชำระเงิน' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const orderData = ref<any>(null)

// Checkout from cart
async function checkout() {
  loading.value = true
  error.value = ''

  try {
    const { data, error: fetchError } = await useFetch('/api/orders/checkout', {
      method: 'POST',
    })

    if (fetchError.value) {
      error.value = fetchError.value.data?.message || 'เกิดข้อผิดพลาดในการสร้างออเดอร์'
      return
    }

    orderData.value = (data.value as any)?.data
  } catch (err: any) {
    error.value = err.message || 'เกิดข้อผิดพลาด'
  } finally {
    loading.value = false
  }
}

// Platform bank account info
const bankInfo = {
  bankName: 'ธนาคารกสิกรไทย',
  accountNumber: 'XXX-X-XXXXX-X',
  accountName: 'บริษัท ลอตโต้ออนไลน์ จำกัด',
  promptPayId: '0-XXXX-XXXXX-XX-X',
}

// Countdown for payment deadline
const paymentDeadline = computed(() => {
  if (!orderData.value?.payment_deadline) return null
  return new Date(orderData.value.payment_deadline)
})

const countdownText = ref('')
let countdownInterval: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval)
  countdownInterval = setInterval(() => {
    if (!paymentDeadline.value) return
    const now = new Date()
    const diff = paymentDeadline.value.getTime() - now.getTime()
    if (diff <= 0) {
      countdownText.value = 'หมดเวลาชำระ'
      clearInterval(countdownInterval!)
      return
    }
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    countdownText.value = `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, 1000)
}

watch(orderData, (val) => {
  if (val) startCountdown()
})

onBeforeUnmount(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})

// Start checkout automatically
onMounted(() => {
  checkout()
})
</script>

<template>
  <div class="page-container max-w-2xl">
    <h1 class="section-title">ชำระเงิน</h1>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <Icon name="ph:spinner" class="text-4xl text-primary animate-spin" />
      <p class="text-[var(--color-text-muted)] mt-3">กำลังสร้างออเดอร์...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card p-6 text-center">
      <Icon name="ph:warning-circle-fill" class="text-4xl text-danger mb-3" />
      <p class="text-danger font-medium">{{ error }}</p>
      <div class="flex gap-3 justify-center mt-4">
        <NuxtLink to="/cart" class="btn btn-outline">กลับไปตะกร้า</NuxtLink>
        <button @click="checkout" class="btn btn-primary">ลองใหม่</button>
      </div>
    </div>

    <!-- Order created — show payment info -->
    <div v-else-if="orderData" class="space-y-6">
      <!-- Order summary -->
      <div class="card p-5 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">สรุปออเดอร์</h2>
          <span class="badge badge-warning">รอชำระเงิน</span>
        </div>
        <div class="text-sm space-y-1 text-[var(--color-text-muted)]">
          <p>เลขออเดอร์: <span class="font-mono text-[var(--color-text)]">{{ orderData.order_number }}</span></p>
          <p>จำนวน: {{ orderData.total_items }} ใบ</p>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
          <span class="font-medium">ยอดชำระทั้งสิ้น</span>
          <span class="text-2xl font-bold text-primary">
            ฿{{ (orderData.total_amount / 100).toLocaleString('th-TH') }}
          </span>
        </div>
      </div>

      <!-- Payment deadline -->
      <div class="card p-4 bg-warning/5 border-warning/20">
        <div class="flex items-center gap-3">
          <Icon name="ph:timer-fill" class="text-2xl text-warning" />
          <div>
            <p class="font-medium">กรุณาชำระภายใน</p>
            <p class="text-xl font-mono font-bold text-warning">{{ countdownText }}</p>
          </div>
        </div>
      </div>

      <!-- Bank transfer info -->
      <div class="card p-5 space-y-4">
        <h2 class="font-semibold flex items-center gap-2">
          <Icon name="ph:bank" class="text-primary" />
          โอนเงินผ่านธนาคาร
        </h2>

        <div class="bg-[var(--color-surface-alt)] rounded-xl p-4 space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-[var(--color-text-muted)]">ธนาคาร</span>
            <span class="font-medium">{{ bankInfo.bankName }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[var(--color-text-muted)]">เลขบัญชี</span>
            <span class="font-mono font-medium">{{ bankInfo.accountNumber }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[var(--color-text-muted)]">ชื่อบัญชี</span>
            <span class="font-medium">{{ bankInfo.accountName }}</span>
          </div>
          <div class="border-t border-[var(--color-border)] pt-3 flex justify-between">
            <span class="text-[var(--color-text-muted)]">ยอดโอน</span>
            <span class="text-lg font-bold text-primary">
              ฿{{ (orderData.total_amount / 100).toLocaleString('th-TH') }}
            </span>
          </div>
        </div>

        <!-- PromptPay -->
        <div class="text-center space-y-3">
          <p class="text-sm text-[var(--color-text-muted)]">หรือ สแกน QR พร้อมเพย์</p>
          <div class="inline-block bg-white p-4 rounded-xl border">
            <div class="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
              <div class="text-center">
                <Icon name="ph:qr-code" class="text-5xl text-gray-400" />
                <p class="text-xs text-gray-500 mt-2">PromptPay QR</p>
                <p class="text-xs font-mono text-gray-600">{{ bankInfo.promptPayId }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload slip -->
      <div class="card p-5 space-y-4">
        <h2 class="font-semibold flex items-center gap-2">
          <Icon name="ph:image" class="text-primary" />
          อัปโหลดสลิปการโอน
        </h2>

        <SlipUploadForm :order-id="orderData.order_id" />
      </div>

      <div class="text-center">
        <NuxtLink :to="`/orders/${orderData.order_id}`" class="text-sm text-primary hover:underline">
          ดูรายละเอียดออเดอร์ →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
