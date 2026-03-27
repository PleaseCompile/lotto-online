<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const supabase = useSupabaseClient()

const { data: stats } = await useAsyncData('admin-stats', async () => {
  const [ticketsRes, ordersRes, paidRes, pendingClaimsRes, verifyingRes, availableRes] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('prize_claims').select('id', { count: 'exact', head: true }).in('status', ['pending', 'claimed']),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'verifying'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'available'),
  ])

  return {
    totalTickets: ticketsRes.count || 0,
    totalOrders: ordersRes.count || 0,
    paidOrders: paidRes.count || 0,
    pendingClaims: pendingClaimsRes.count || 0,
    verifyingOrders: verifyingRes.count || 0,
    availableTickets: availableRes.count || 0,
  }
})

// Recent orders for dashboard
const { data: recentOrders } = await useAsyncData('recent-orders', async () => {
  const { data } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, total_items, status, created_at, users(full_name)')
    .order('created_at', { ascending: false })
    .limit(10)
  return data || []
})

const statusLabels: Record<string, string> = {
  pending_payment: 'รอชำระ',
  verifying: 'ตรวจสอบ',
  paid: 'ชำระแล้ว',
  cancelled: 'ยกเลิก',
  expired: 'หมดเวลา',
}
const statusColors: Record<string, string> = {
  pending_payment: 'badge-warning',
  verifying: 'badge-warning',
  paid: 'badge-success',
  cancelled: 'badge-danger',
  expired: '',
}
const formatPrice = (satang: number) => new Intl.NumberFormat('th-TH').format(satang / 100)

useSeoMeta({ title: 'Admin Dashboard' })
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="ph:ticket-fill" class="text-primary text-xl" />
          </div>
          <div>
            <p class="text-xs text-[var(--color-text-muted)]">ลอตเตอรี่ทั้งหมด</p>
            <p class="text-2xl font-bold">{{ (stats?.totalTickets || 0).toLocaleString('th-TH') }}</p>
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Icon name="ph:shopping-bag-fill" class="text-secondary text-xl" />
          </div>
          <div>
            <p class="text-xs text-[var(--color-text-muted)]">ออเดอร์ทั้งหมด</p>
            <p class="text-2xl font-bold">{{ (stats?.totalOrders || 0).toLocaleString('th-TH') }}</p>
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <Icon name="ph:check-circle-fill" class="text-success text-xl" />
          </div>
          <div>
            <p class="text-xs text-[var(--color-text-muted)]">ชำระเงินแล้ว</p>
            <p class="text-2xl font-bold">{{ (stats?.paidOrders || 0).toLocaleString('th-TH') }}</p>
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Icon name="ph:trophy-fill" class="text-warning text-xl" />
          </div>
          <div>
            <p class="text-xs text-[var(--color-text-muted)]">รอจ่ายรางวัล</p>
            <p class="text-2xl font-bold">{{ (stats?.pendingClaims || 0).toLocaleString('th-TH') }}</p>
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="ph:eye-fill" class="text-primary text-xl" />
          </div>
          <div>
            <p class="text-xs text-[var(--color-text-muted)]">รอตรวจสลิป</p>
            <p class="text-2xl font-bold">{{ (stats?.verifyingOrders || 0).toLocaleString('th-TH') }}</p>
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Icon name="ph:tag-fill" class="text-secondary text-xl" />
          </div>
          <div>
            <p class="text-xs text-[var(--color-text-muted)]">ลอตเตอรี่พร้อมขาย</p>
            <p class="text-2xl font-bold">{{ (stats?.availableTickets || 0).toLocaleString('th-TH') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="mt-8">
      <h2 class="section-title mb-4">ออเดอร์ล่าสุด</h2>
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border dark:border-border-dark bg-surface-alt dark:bg-surface-dark-alt">
                <th class="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Order #</th>
                <th class="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">ลูกค้า</th>
                <th class="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">จำนวน</th>
                <th class="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">ยอดรวม</th>
                <th class="text-center px-4 py-3 font-medium text-[var(--color-text-muted)]">สถานะ</th>
              </tr>
            </thead>
            <tbody v-if="!recentOrders?.length">
              <tr>
                <td colspan="5" class="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  ยังไม่มีออเดอร์
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr
                v-for="order in recentOrders"
                :key="order.id"
                class="border-b border-border/50 dark:border-border-dark/50 hover:bg-surface-alt/50 dark:hover:bg-surface-dark-alt/50"
              >
                <td class="px-4 py-3 font-mono text-sm">{{ order.order_number }}</td>
                <td class="px-4 py-3">{{ (order as any).users?.full_name || '-' }}</td>
                <td class="px-4 py-3 text-right">{{ order.total_items }}</td>
                <td class="px-4 py-3 text-right font-mono">฿{{ formatPrice(order.total_amount) }}</td>
                <td class="px-4 py-3 text-center">
                  <span class="badge" :class="statusColors[order.status] || ''">
                    {{ statusLabels[order.status] || order.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <NuxtLink to="/admin/tickets/import" class="card card-hover p-5 flex items-center gap-3">
        <Icon name="ph:barcode" class="text-2xl text-primary" />
        <div>
          <p class="font-medium">นำเข้าลอตเตอรี่</p>
          <p class="text-xs text-[var(--color-text-muted)]">สแกนบาร์โค้ดหรือพิมพ์เลข</p>
        </div>
      </NuxtLink>
      <NuxtLink to="/admin/orders" class="card card-hover p-5 flex items-center gap-3">
        <Icon name="ph:shopping-bag" class="text-2xl text-secondary" />
        <div>
          <p class="font-medium">จัดการออเดอร์</p>
          <p class="text-xs text-[var(--color-text-muted)]">ดูและยืนยันการชำระเงิน</p>
        </div>
      </NuxtLink>
      <NuxtLink to="/admin/prize-claims" class="card card-hover p-5 flex items-center gap-3">
        <Icon name="ph:trophy" class="text-2xl text-warning" />
        <div>
          <p class="font-medium">จัดการรางวัล</p>
          <p class="text-xs text-[var(--color-text-muted)]">จ่ายเงินรางวัลผู้ถูกรางวัล</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
