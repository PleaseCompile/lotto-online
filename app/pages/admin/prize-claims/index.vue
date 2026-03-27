<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const page = ref(1)
const statusFilter = ref('')
const drawFilter = ref('')

const queryParams = computed(() => ({
  page: page.value,
  limit: 20,
  ...(statusFilter.value && { status: statusFilter.value }),
  ...(drawFilter.value && { draw_id: drawFilter.value }),
}))

const { data: response, pending, refresh } = await useAsyncData(
  'admin-prize-claims',
  () => $fetch<any>('/api/admin/prize-claims', { params: queryParams.value }),
  { watch: [queryParams] },
)

const claims = computed(() => response.value?.data || [])
const pagination = computed(() => response.value?.pagination || { page: 1, totalPages: 1, total: 0 })

// Fetch draws for filter
const supabase = useSupabaseClient()
const { data: draws } = await useAsyncData('draws-filter', async () => {
  const { data } = await supabase
    .from('lottery_draws')
    .select('id, draw_date_thai')
    .eq('status', 'resulted')
    .order('draw_date', { ascending: false })
  return data || []
})

const statusLabels: Record<string, string> = {
  pending: 'รอขึ้นเงิน',
  claimed: 'รอจ่าย',
  paid: 'จ่ายแล้ว',
  rejected: 'ปฏิเสธ',
}

const statusColors: Record<string, string> = {
  pending: 'badge-warning',
  claimed: 'badge-warning',
  paid: 'badge-success',
  rejected: 'badge-danger',
}

const formatPrice = (satang: number) => new Intl.NumberFormat('th-TH').format(satang / 100)
const formatDate = (d: string) => new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })

const processing = ref<string | null>(null)

async function processPayout(claimId: string) {
  if (!confirm('ยืนยันการจ่ายเงินรางวัลนี้?')) return
  processing.value = claimId
  try {
    await $fetch(`/api/admin/prize-claims/${claimId}/process-payout`, { method: 'POST' })
    await refresh()
  } catch (err: any) {
    alert(err.data?.message || 'เกิดข้อผิดพลาด')
  } finally {
    processing.value = null
  }
}

useSeoMeta({ title: 'จัดการรางวัล — Admin' })
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">จัดการรางวัล</h1>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-4">
      <select v-model="statusFilter" class="input" @change="page = 1">
        <option value="">ทุกสถานะ</option>
        <option value="pending">รอขึ้นเงิน</option>
        <option value="claimed">รอจ่าย</option>
        <option value="paid">จ่ายแล้ว</option>
      </select>
      <select v-model="drawFilter" class="input" @change="page = 1">
        <option value="">ทุกงวด</option>
        <option v-for="d in draws" :key="d.id" :value="d.id">{{ d.draw_date_thai }}</option>
      </select>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border dark:border-border-dark bg-surface-alt dark:bg-surface-dark-alt">
              <th class="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">เลขลอตเตอรี่</th>
              <th class="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">ผู้ถูกรางวัล</th>
              <th class="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">ประเภทรางวัล</th>
              <th class="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">เงินรางวัล</th>
              <th class="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">ค่าธรรมเนียม</th>
              <th class="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">สุทธิ</th>
              <th class="text-center px-4 py-3 font-medium text-[var(--color-text-muted)]">สถานะ</th>
              <th class="text-center px-4 py-3 font-medium text-[var(--color-text-muted)]">จัดการ</th>
            </tr>
          </thead>
          <tbody v-if="pending">
            <tr v-for="i in 5" :key="i">
              <td colspan="8" class="px-4 py-3"><SkeletonLoader height="1.5rem" /></td>
            </tr>
          </tbody>
          <tbody v-else-if="!claims.length">
            <tr>
              <td colspan="8" class="px-4 py-8 text-center text-[var(--color-text-muted)]">ไม่พบรายการรางวัล</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="claim in claims"
              :key="claim.id"
              class="border-b border-border/50 dark:border-border-dark/50 hover:bg-surface-alt/50 dark:hover:bg-surface-dark-alt/50"
            >
              <td class="px-4 py-3 font-mono font-bold">{{ claim.tickets?.ticket_number }}</td>
              <td class="px-4 py-3">
                <p class="font-medium">{{ claim.users?.full_name || '-' }}</p>
                <p class="text-xs text-[var(--color-text-muted)]">{{ claim.users?.phone || '-' }}</p>
              </td>
              <td class="px-4 py-3">{{ claim.prize_type }}</td>
              <td class="px-4 py-3 text-right font-mono">฿{{ formatPrice(claim.prize_amount) }}</td>
              <td class="px-4 py-3 text-right font-mono text-[var(--color-text-muted)]">฿{{ formatPrice(claim.platform_fee) }}</td>
              <td class="px-4 py-3 text-right font-mono font-semibold text-success">฿{{ formatPrice(claim.net_amount) }}</td>
              <td class="px-4 py-3 text-center">
                <span class="badge" :class="statusColors[claim.status] || ''">
                  {{ statusLabels[claim.status] || claim.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  v-if="claim.status === 'claimed'"
                  class="text-success text-sm hover:underline font-medium"
                  :disabled="processing === claim.id"
                  @click="processPayout(claim.id)"
                >
                  <Icon v-if="processing === claim.id" name="ph:spinner" class="animate-spin" />
                  จ่ายรางวัล
                </button>
                <span v-else-if="claim.status === 'paid'" class="text-xs text-[var(--color-text-muted)]">
                  {{ claim.paid_at ? formatDate(claim.paid_at) : '-' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-4">
      <button class="btn text-sm" :disabled="page <= 1" @click="page--">ก่อนหน้า</button>
      <span class="flex items-center text-sm text-[var(--color-text-muted)]">
        {{ page }} / {{ pagination.totalPages }}
      </span>
      <button class="btn text-sm" :disabled="page >= pagination.totalPages" @click="page++">ถัดไป</button>
    </div>
  </div>
</template>
