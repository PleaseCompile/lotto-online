<script setup lang="ts">
import type { CartItem, Ticket } from '~/types/database'

definePageMeta({
  middleware: ['auth'],
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const { data: cartItems, pending, refresh } = await useAsyncData('cart', async () => {
  if (!user.value) return []
  const { data } = await supabase
    .from('cart_items')
    .select('*, tickets(*)')
    .eq('user_id', user.value.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  return (data || []) as (CartItem & { tickets: Ticket })[]
})

const totalAmount = computed(() => {
  return cartItems.value?.reduce((sum, item) => sum + (item.tickets?.price || 0), 0) || 0
})

const formatPrice = (satang: number) => {
  return new Intl.NumberFormat('th-TH').format(satang / 100)
}

const getCountdown = (expiresAt: string) => {
  const now = Date.now()
  const expires = new Date(expiresAt).getTime()
  const diff = Math.max(0, Math.floor((expires - now) / 1000))
  const min = Math.floor(diff / 60)
  const sec = diff % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

const removingId = ref<string | null>(null)

const removeItem = async (cartItemId: string, ticketId: string) => {
  removingId.value = cartItemId
  try {
    await useFetch(`/api/cart/${ticketId}`, { method: 'DELETE' })
    await refresh()
  } finally {
    removingId.value = null
  }
}

const checkingOut = ref(false)

const checkout = async () => {
  checkingOut.value = true
  try {
    const { data, error } = await useFetch('/api/orders/checkout', {
      method: 'POST',
    })
    if (!error.value && data.value) {
      navigateTo(`/orders/${(data.value as any).data.order_id}`)
    }
  } finally {
    checkingOut.value = false
  }
}

// Update countdowns every second
const countdowns = ref<Record<string, string>>({})
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    cartItems.value?.forEach(item => {
      countdowns.value[item.id] = getCountdown(item.expires_at)
    })
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})

useSeoMeta({
  title: 'ตะกร้าสินค้า — ลอตโต้ออนไลน์',
})
</script>

<template>
  <div class="page-container">
    <h1 class="text-2xl font-bold mb-6">ตะกร้าสินค้า</h1>

    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card p-4">
        <SkeletonLoader height="2.5rem" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!cartItems?.length" class="text-center py-20">
      <Icon name="ph:shopping-cart" class="text-5xl text-[var(--color-text-muted)] mb-3" />
      <p class="text-[var(--color-text-muted)] mb-4">ตะกร้าของคุณว่างเปล่า</p>
      <NuxtLink to="/tickets" class="btn-primary">
        <Icon name="ph:ticket" />
        เลือกซื้อลอตเตอรี่
      </NuxtLink>
    </div>

    <!-- Cart Items -->
    <template v-else>
      <div class="space-y-3 mb-6">
        <div
          v-for="item in cartItems"
          :key="item.id"
          class="card p-4 flex items-center gap-4"
        >
          <!-- Ticket Number -->
          <div class="flex-1">
            <p class="text-xl font-mono font-bold tracking-wider">
              {{ item.tickets?.ticket_number }}
            </p>
            <div class="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
              <span v-if="item.tickets?.set_number">ชุดที่ {{ item.tickets.set_number }}</span>
              <span class="flex items-center gap-1 text-warning">
                <Icon name="ph:timer" />
                {{ countdowns[item.id] || getCountdown(item.expires_at) }}
              </span>
            </div>
          </div>

          <!-- Price -->
          <p class="font-semibold text-primary whitespace-nowrap">
            {{ formatPrice(item.tickets?.price || 0) }} บาท
          </p>

          <!-- Remove -->
          <button
            class="p-1.5 rounded-md hover:bg-danger/10 text-[var(--color-text-muted)] hover:text-danger transition-colors"
            :disabled="removingId === item.id"
            @click="removeItem(item.id, item.ticket_id)"
          >
            <Icon :name="removingId === item.id ? 'ph:spinner' : 'ph:trash'" :class="{ 'animate-spin': removingId === item.id }" />
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div class="card p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[var(--color-text-muted)]">จำนวน</span>
          <span class="font-medium">{{ cartItems.length }} ใบ</span>
        </div>
        <div class="flex items-center justify-between mb-4 pb-4 border-b border-border dark:border-border-dark">
          <span class="font-semibold">ยอดรวม</span>
          <span class="text-2xl font-bold text-primary">{{ formatPrice(totalAmount) }} บาท</span>
        </div>
        <UiButton
          variant="primary"
          size="lg"
          class="w-full"
          :loading="checkingOut"
          @click="checkout"
        >
          <Icon name="ph:credit-card" />
          ดำเนินการสั่งซื้อ
        </UiButton>
        <p class="text-xs text-center text-[var(--color-text-muted)] mt-3">
          ลอตเตอรี่จะถูกล็อกให้คุณ 15 นาที หลังจากนั้นจะถูกปล่อยกลับอัตโนมัติ
        </p>
      </div>
    </template>
  </div>
</template>
