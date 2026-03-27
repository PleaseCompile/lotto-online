<script setup lang="ts">
import type { Ticket, LotteryDraw } from '~/types/database'

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const ticketId = route.params.id as string

const { data: ticket, pending } = await useAsyncData(`ticket-${ticketId}`, async () => {
  const { data } = await supabase
    .from('tickets')
    .select('*, lottery_draws(*)')
    .eq('id', ticketId)
    .single()
  return data as (Ticket & { lottery_draws: LotteryDraw }) | null
})

const addingToCart = ref(false)
const cartError = ref<string | null>(null)
const cartSuccess = ref(false)

const addToCart = async () => {
  if (!user.value) {
    navigateTo({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  addingToCart.value = true
  cartError.value = null

  try {
    const { data, error } = await useFetch('/api/cart/add', {
      method: 'POST',
      body: { ticket_id: ticketId },
    })

    if (error.value) {
      cartError.value = error.value.data?.message || 'ไม่สามารถเพิ่มลงตะกร้าได้'
      return
    }

    cartSuccess.value = true
    setTimeout(() => { cartSuccess.value = false }, 3000)
  } finally {
    addingToCart.value = false
  }
}

const formatPrice = (satang: number) => {
  return new Intl.NumberFormat('th-TH').format(satang / 100)
}

const statusLabel: Record<string, string> = {
  available: 'ว่าง',
  locked: 'ถูกจอง',
  sold: 'ขายแล้ว',
  prize_claimed: 'ขึ้นเงินแล้ว',
}

useSeoMeta({
  title: ticket.value ? `ลอตเตอรี่ ${ticket.value.ticket_number}` : 'รายละเอียดลอตเตอรี่',
})
</script>

<template>
  <div class="page-container">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] mb-6">
      <NuxtLink to="/" class="hover:text-primary transition-colors">หน้าหลัก</NuxtLink>
      <Icon name="ph:caret-right" class="text-xs" />
      <NuxtLink to="/tickets" class="hover:text-primary transition-colors">ลอตเตอรี่</NuxtLink>
      <Icon name="ph:caret-right" class="text-xs" />
      <span class="text-[var(--color-text)]">{{ ticket?.ticket_number || '...' }}</span>
    </nav>

    <!-- Loading -->
    <div v-if="pending" class="card p-8 max-w-lg mx-auto">
      <SkeletonLoader height="4rem" class="mb-4" />
      <SkeletonLoader height="1.5rem" width="50%" class="mb-2" />
      <SkeletonLoader height="1rem" width="30%" />
    </div>

    <!-- Not found -->
    <div v-else-if="!ticket" class="text-center py-20">
      <Icon name="ph:warning-circle" class="text-5xl text-[var(--color-text-muted)] mb-3" />
      <p class="text-[var(--color-text-muted)]">ไม่พบลอตเตอรี่ใบนี้</p>
      <NuxtLink to="/tickets" class="btn-primary mt-4 inline-flex">
        กลับหน้าค้นหา
      </NuxtLink>
    </div>

    <!-- Ticket Detail -->
    <div v-else class="max-w-2xl mx-auto">
      <div class="card overflow-hidden">
        <!-- Ticket Header -->
        <div class="bg-gradient-to-r from-secondary to-secondary-light p-6 text-center">
          <p class="text-white/60 text-sm">สลากกินแบ่งรัฐบาล</p>
          <p class="text-4xl lg:text-5xl font-mono font-bold tracking-[0.2em] text-white mt-2">
            {{ ticket.ticket_number }}
          </p>
          <div class="flex items-center justify-center gap-4 mt-3 text-white/70 text-sm">
            <span v-if="ticket.set_number">ชุดที่ {{ ticket.set_number }}</span>
            <span>{{ ticket.lottery_draws?.draw_date_thai }}</span>
          </div>
        </div>

        <!-- Details -->
        <div class="p-6 space-y-4">
          <!-- Status -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--color-text-muted)]">สถานะ</span>
            <span
              class="badge"
              :class="{
                'badge-success': ticket.status === 'available',
                'badge-warning': ticket.status === 'locked',
                'badge-danger': ticket.status === 'sold' || ticket.status === 'prize_claimed',
              }"
            >
              {{ statusLabel[ticket.status] }}
            </span>
          </div>

          <!-- Price -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--color-text-muted)]">ราคา</span>
            <span class="text-2xl font-bold text-primary">{{ formatPrice(ticket.price) }} บาท</span>
          </div>

          <!-- Messages -->
          <div v-if="cartError" class="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
            <div class="flex items-center gap-2">
              <Icon name="ph:warning-circle" />
              {{ cartError }}
            </div>
          </div>

          <div v-if="cartSuccess" class="p-3 rounded-md bg-success/10 border border-success/20 text-success text-sm">
            <div class="flex items-center gap-2">
              <Icon name="ph:check-circle" />
              เพิ่มลงตะกร้าเรียบร้อย! ล็อกให้คุณ 15 นาที
            </div>
          </div>

          <!-- Action -->
          <div class="pt-2">
            <UiButton
              v-if="ticket.status === 'available'"
              variant="primary"
              size="lg"
              class="w-full"
              :loading="addingToCart"
              @click="addToCart"
            >
              <Icon name="ph:shopping-cart" />
              หยิบใส่ตะกร้า
            </UiButton>
            <div v-else class="text-center py-4">
              <p class="text-[var(--color-text-muted)]">
                ลอตเตอรี่ใบนี้{{ ticket.status === 'locked' ? 'ถูกจองอยู่' : 'ขายแล้ว' }}
              </p>
              <NuxtLink to="/tickets" class="btn-outline mt-3 inline-flex">
                ดูใบอื่น
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Go to Cart -->
      <div v-if="cartSuccess" class="mt-4 text-center">
        <NuxtLink to="/cart" class="btn-secondary">
          <Icon name="ph:shopping-cart" />
          ไปที่ตะกร้า
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
