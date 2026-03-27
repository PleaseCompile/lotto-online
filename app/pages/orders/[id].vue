<script setup lang="ts">
import type { Order, OrderItem, Ticket } from '~/types/database'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const userId = useUserId()
const orderId = route.params.id as string

const { data: order, pending } = await useAsyncData(`order-${orderId}`, async () => {
  if (!user.value) return null
  const { data } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*, tickets(ticket_number, set_number))
    `)
    .eq('id', orderId)
    .eq('user_id', userId.value)
    .single()
  return data as (Order & { order_items: (OrderItem & { tickets: Pick<Ticket, 'ticket_number' | 'set_number'> })[] }) | null
})

const formatPrice = (satang: number) => {
  return new Intl.NumberFormat('th-TH').format(satang / 100)
}

const statusLabel: Record<string, string> = {
  pending_payment: 'รอชำระเงิน',
  verifying: 'กำลังตรวจสอบสลิป',
  paid: 'ชำระแล้ว',
  cancelled: 'ยกเลิก',
  refunded: 'คืนเงินแล้ว',
}

useSeoMeta({
  title: order.value ? `คำสั่งซื้อ ${order.value.order_number}` : 'รายละเอียดคำสั่งซื้อ',
})
</script>

<template>
  <div class="page-container">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] mb-6">
      <NuxtLink to="/orders" class="hover:text-primary transition-colors">คำสั่งซื้อ</NuxtLink>
      <Icon name="ph:caret-right" class="text-xs" />
      <span class="text-[var(--color-text)]">{{ order?.order_number || '...' }}</span>
    </nav>

    <div v-if="pending" class="card p-6">
      <SkeletonLoader height="2rem" class="mb-4" />
      <SkeletonLoader height="1.5rem" width="50%" />
    </div>

    <div v-else-if="!order" class="text-center py-20">
      <p class="text-[var(--color-text-muted)]">ไม่พบคำสั่งซื้อนี้</p>
    </div>

    <div v-else class="max-w-2xl mx-auto space-y-4">
      <!-- Order Header -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-lg font-bold font-mono">{{ order.order_number }}</h1>
          <span
            class="badge"
            :class="{
              'badge-warning': order.status === 'pending_payment',
              'badge-primary': order.status === 'verifying',
              'badge-success': order.status === 'paid',
              'badge-danger': order.status === 'cancelled' || order.status === 'refunded',
            }"
          >
            {{ statusLabel[order.status] }}
          </span>
        </div>
        <div class="text-sm text-[var(--color-text-muted)] space-y-1">
          <p>สร้างเมื่อ: {{ new Date(order.created_at).toLocaleString('th-TH') }}</p>
          <p v-if="order.status === 'pending_payment'">
            กำหนดชำระ: {{ new Date(order.payment_deadline).toLocaleString('th-TH') }}
          </p>
        </div>
      </div>

      <!-- Order Items -->
      <div class="card overflow-hidden">
        <div class="px-4 py-3 border-b border-border dark:border-border-dark bg-surface-alt dark:bg-surface-dark-alt">
          <h3 class="font-medium text-sm">รายการลอตเตอรี่ ({{ order.total_items }} ใบ)</h3>
        </div>
        <div class="divide-y divide-border dark:divide-border-dark">
          <div
            v-for="item in order.order_items"
            :key="item.id"
            class="flex items-center justify-between px-4 py-3"
          >
            <div>
              <span class="font-mono font-bold tracking-wider">{{ item.tickets?.ticket_number }}</span>
              <span v-if="item.tickets?.set_number" class="text-xs text-[var(--color-text-muted)] ml-2">
                ชุดที่ {{ item.tickets.set_number }}
              </span>
            </div>
            <span class="font-medium">{{ formatPrice(item.price) }} บาท</span>
          </div>
        </div>
        <div class="px-4 py-3 border-t border-border dark:border-border-dark bg-surface-alt dark:bg-surface-dark-alt flex justify-between">
          <span class="font-semibold">ยอดรวม</span>
          <span class="font-bold text-primary text-lg">{{ formatPrice(order.total_amount) }} บาท</span>
        </div>
      </div>

      <!-- Payment Section -->
      <div v-if="order.status === 'pending_payment'" class="card p-6">
        <h3 class="font-semibold mb-4">ชำระเงิน</h3>
        <p class="text-sm text-[var(--color-text-muted)] mb-4">
          โอนเงินตามจำนวนด้านบน แล้วอัปโหลดสลิปการโอน
        </p>

        <SlipUploadForm :order-id="orderId" />
      </div>
    </div>
  </div>
</template>
