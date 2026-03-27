<script setup lang="ts">
import type { Order } from '~/types/database'

definePageMeta({
  middleware: ['auth'],
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const { data: orders, pending } = await useAsyncData('my-orders', async () => {
  if (!user.value) return []
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.value.id)
    .order('created_at', { ascending: false })
  return (data || []) as Order[]
})

const formatPrice = (satang: number) => {
  return new Intl.NumberFormat('th-TH').format(satang / 100)
}

const statusLabel: Record<string, string> = {
  pending_payment: 'รอชำระเงิน',
  verifying: 'กำลังตรวจสอบ',
  paid: 'ชำระแล้ว',
  cancelled: 'ยกเลิก',
  refunded: 'คืนเงินแล้ว',
}

const statusClass: Record<string, string> = {
  pending_payment: 'badge-warning',
  verifying: 'badge-primary',
  paid: 'badge-success',
  cancelled: 'badge-danger',
  refunded: 'badge-danger',
}

useSeoMeta({ title: 'คำสั่งซื้อของฉัน' })
</script>

<template>
  <div class="page-container">
    <h1 class="text-2xl font-bold mb-6">คำสั่งซื้อของฉัน</h1>

    <div v-if="pending" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card p-4">
        <SkeletonLoader height="1.5rem" class="mb-2" />
        <SkeletonLoader height="1rem" width="50%" />
      </div>
    </div>

    <div v-else-if="!orders?.length" class="text-center py-20">
      <Icon name="ph:shopping-bag" class="text-5xl text-[var(--color-text-muted)] mb-3" />
      <p class="text-[var(--color-text-muted)] mb-4">ยังไม่มีคำสั่งซื้อ</p>
      <NuxtLink to="/tickets" class="btn-primary">ซื้อลอตเตอรี่</NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <NuxtLink
        v-for="order in orders"
        :key="order.id"
        :to="`/orders/${order.id}`"
        class="card-hover p-4 flex items-center justify-between"
      >
        <div>
          <p class="font-mono font-medium">{{ order.order_number }}</p>
          <p class="text-xs text-[var(--color-text-muted)] mt-0.5">
            {{ new Date(order.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) }}
            · {{ order.total_items }} ใบ
          </p>
        </div>
        <div class="text-right">
          <p class="font-semibold text-primary">{{ formatPrice(order.total_amount) }} บาท</p>
          <span :class="statusClass[order.status]" class="mt-1">
            {{ statusLabel[order.status] }}
          </span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
