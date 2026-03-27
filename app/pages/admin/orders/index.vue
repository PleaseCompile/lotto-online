<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const page = ref(1)
const statusFilter = ref('')
const search = ref('')
const searchDebounced = ref('')

let debounceTimer: ReturnType<typeof setTimeout>
watch(search, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    searchDebounced.value = val
    page.value = 1
  }, 400)
})

const queryParams = computed(() => ({
  page: page.value,
  limit: 20,
  ...(statusFilter.value && { status: statusFilter.value }),
  ...(searchDebounced.value && { search: searchDebounced.value }),
}))

const { data: response, pending, refresh } = await useAsyncData(
  'admin-orders',
  () => $fetch<any>('/api/admin/orders', { params: queryParams.value }),
  { watch: [queryParams] },
)

const orders = computed(() => response.value?.data || [])
const pagination = computed(() => response.value?.pagination || { page: 1, totalPages: 1, total: 0 })

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
const formatDate = (d: string) => new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })

const verifying = ref<string | null>(null)

async function manualVerify(orderId: string) {
  if (!confirm('ยืนยันการชำระเงินของออเดอร์นี้?')) return
  verifying.value = orderId
  try {
    await $fetch(`/api/admin/orders/${orderId}/verify-manual`, { method: 'POST' })
    await refresh()
  } catch (err: any) {
    alert(err.data?.message || 'เกิดข้อผิดพลาด')
  } finally {
    verifying.value = null
  }
}

useSeoMeta({ title: 'จัดการออเดอร์ — Admin' })
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">จัดการออเดอร์</h1>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-4">
      <input
        v-model="search"
        type="text"
        class="input w-60"
        placeholder="ค้นหาเลข Order..."
      />
      <select v-model="statusFilter" class="input">
        <option value="">ทุกสถานะ</option>
        <option value="pending_payment">รอชำระ</option>
        <option value="verifying">ตรวจสอบ</option>
        <option value="paid">ชำระแล้ว</option>
        <option value="cancelled">ยกเลิก</option>
        <option value="expired">หมดเวลา</option>
      </select>
    </div>

    <!-- Table -->
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
              <th class="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">วันที่</th>
              <th class="text-center px-4 py-3 font-medium text-[var(--color-text-muted)]">จัดการ</th>
            </tr>
          </thead>
          <tbody v-if="pending">
            <tr v-for="i in 5" :key="i">
              <td colspan="7" class="px-4 py-3"><SkeletonLoader height="1.5rem" /></td>
            </tr>
          </tbody>
          <tbody v-else-if="!orders.length">
            <tr>
              <td colspan="7" class="px-4 py-8 text-center text-[var(--color-text-muted)]">ไม่พบออเดอร์</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="order in orders"
              :key="order.id"
              class="border-b border-border/50 dark:border-border-dark/50 hover:bg-surface-alt/50 dark:hover:bg-surface-dark-alt/50"
            >
              <td class="px-4 py-3 font-mono text-sm">{{ order.order_number }}</td>
              <td class="px-4 py-3">
                <p class="font-medium">{{ order.users?.full_name || '-' }}</p>
                <p class="text-xs text-[var(--color-text-muted)]">{{ order.users?.phone || '-' }}</p>
              </td>
              <td class="px-4 py-3 text-right">{{ order.total_items }}</td>
              <td class="px-4 py-3 text-right font-mono">฿{{ formatPrice(order.total_amount) }}</td>
              <td class="px-4 py-3 text-center">
                <span class="badge" :class="statusColors[order.status] || ''">
                  {{ statusLabels[order.status] || order.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-muted)]">{{ formatDate(order.created_at) }}</td>
              <td class="px-4 py-3 text-center">
                <button
                  v-if="order.status === 'verifying'"
                  class="text-success text-sm hover:underline"
                  :disabled="verifying === order.id"
                  @click="manualVerify(order.id)"
                >
                  <Icon v-if="verifying === order.id" name="ph:spinner" class="animate-spin" />
                  ยืนยันชำระ
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-4">
      <button
        class="btn text-sm"
        :disabled="page <= 1"
        @click="page--"
      >
        ก่อนหน้า
      </button>
      <span class="flex items-center text-sm text-[var(--color-text-muted)]">
        {{ page }} / {{ pagination.totalPages }}
      </span>
      <button
        class="btn text-sm"
        :disabled="page >= pagination.totalPages"
        @click="page++"
      >
        ถัดไป
      </button>
    </div>
  </div>
</template>
