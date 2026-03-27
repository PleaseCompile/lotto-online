<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

useSeoMeta({ title: 'จัดการลอตเตอรี่' })

const supabase = useSupabaseClient()

const page = ref(1)
const limit = ref(20)
const search = ref('')
const statusFilter = ref('')
const drawFilter = ref('')

// Load draws for filter
const { data: draws } = await useAsyncData('admin-draws-filter', async () => {
  const { data } = await supabase
    .from('lottery_draws')
    .select('id, draw_date')
    .order('draw_date', { ascending: false })
    .limit(20)
  return data || []
})

const { data: ticketsData, refresh } = await useAsyncData(
  'admin-tickets',
  async () => {
    const res = await $fetch('/api/admin/tickets', {
      query: {
        page: page.value,
        limit: limit.value,
        search: search.value || undefined,
        status: statusFilter.value || undefined,
        draw_id: drawFilter.value || undefined,
      },
    })
    return res as any
  },
  { watch: [page, limit, statusFilter, drawFilter] }
)

const editingId = ref<string | null>(null)
const editPrice = ref(0)

function startEdit(ticket: any) {
  editingId.value = ticket.id
  editPrice.value = ticket.price / 100
}

async function saveEdit(id: string) {
  await $fetch(`/api/admin/tickets/${id}`, {
    method: 'PUT',
    body: { price: editPrice.value * 100 },
  })
  editingId.value = null
  await refresh()
}

async function deleteTicket(id: string) {
  if (!confirm('ต้องการลบลอตเตอรี่นี้?')) return
  await $fetch(`/api/admin/tickets/${id}`, { method: 'DELETE' })
  await refresh()
}

function doSearch() {
  page.value = 1
  refresh()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    available: 'พร้อมขาย',
    reserved: 'จอง',
    sold: 'ขายแล้ว',
    cancelled: 'ยกเลิก',
  }
  return map[s] || s
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    available: 'badge-success',
    reserved: 'badge-warning',
    sold: 'badge-primary',
    cancelled: 'badge-danger',
  }
  return map[s] || ''
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1 class="text-2xl font-bold">จัดการลอตเตอรี่</h1>
      <NuxtLink to="/admin/tickets/import" class="btn btn-primary text-sm">
        <Icon name="ph:barcode" class="mr-1" />
        นำเข้าลอตเตอรี่
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="sm:col-span-2">
          <input
            v-model="search"
            type="text"
            class="input"
            placeholder="ค้นหาเลขลอตเตอรี่..."
            @keyup.enter="doSearch"
          />
        </div>
        <select v-model="statusFilter" class="input">
          <option value="">ทุกสถานะ</option>
          <option value="available">พร้อมขาย</option>
          <option value="reserved">จอง</option>
          <option value="sold">ขายแล้ว</option>
          <option value="cancelled">ยกเลิก</option>
        </select>
        <select v-model="drawFilter" class="input">
          <option value="">ทุกงวด</option>
          <option v-for="draw in draws" :key="draw.id" :value="draw.id">
            {{ formatDate(draw.draw_date) }}
          </option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-[var(--color-surface-alt)]">
          <tr>
            <th class="text-left px-4 py-3 font-medium">เลข</th>
            <th class="text-left px-4 py-3 font-medium">ชุด</th>
            <th class="text-left px-4 py-3 font-medium">งวด</th>
            <th class="text-left px-4 py-3 font-medium">ราคา</th>
            <th class="text-left px-4 py-3 font-medium">สถานะ</th>
            <th class="text-right px-4 py-3 font-medium">จัดการ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)]">
          <tr v-for="ticket in ticketsData?.data || []" :key="ticket.id" class="hover:bg-[var(--color-surface-alt)]/50">
            <td class="px-4 py-3 font-mono font-bold tracking-widest text-lg">
              {{ ticket.number }}
            </td>
            <td class="px-4 py-3">{{ ticket.set_number }}</td>
            <td class="px-4 py-3 text-xs">
              {{ ticket.lottery_draws ? formatDate(ticket.lottery_draws.draw_date) : '-' }}
            </td>
            <td class="px-4 py-3">
              <template v-if="editingId === ticket.id">
                <div class="flex items-center gap-2">
                  <input v-model.number="editPrice" type="number" class="input w-24 text-sm" />
                  <button @click="saveEdit(ticket.id)" class="text-success hover:text-success/80">
                    <Icon name="ph:check" />
                  </button>
                  <button @click="editingId = null" class="text-danger hover:text-danger/80">
                    <Icon name="ph:x" />
                  </button>
                </div>
              </template>
              <template v-else>
                ฿{{ (ticket.price / 100).toLocaleString('th-TH') }}
              </template>
            </td>
            <td class="px-4 py-3">
              <span class="badge" :class="statusColor(ticket.status)">
                {{ statusLabel(ticket.status) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button
                  v-if="ticket.status !== 'sold'"
                  @click="startEdit(ticket)"
                  class="p-1.5 text-[var(--color-text-muted)] hover:text-primary rounded"
                  title="แก้ไขราคา"
                >
                  <Icon name="ph:pencil" />
                </button>
                <button
                  v-if="ticket.status !== 'sold'"
                  @click="deleteTicket(ticket.id)"
                  class="p-1.5 text-[var(--color-text-muted)] hover:text-danger rounded"
                  title="ลบ"
                >
                  <Icon name="ph:trash" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!ticketsData?.data?.length" class="text-center py-12 text-[var(--color-text-muted)]">
        <Icon name="ph:ticket" class="text-4xl mb-2" /><br />
        ยังไม่มีลอตเตอรี่
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="ticketsData?.pagination" class="flex items-center justify-between text-sm">
      <p class="text-[var(--color-text-muted)]">
        ทั้งหมด {{ ticketsData.pagination.total.toLocaleString('th-TH') }} ใบ
      </p>
      <div class="flex gap-2">
        <button
          @click="page--"
          :disabled="page <= 1"
          class="btn btn-outline text-sm"
        >
          <Icon name="ph:caret-left" /> ก่อนหน้า
        </button>
        <span class="px-3 py-2">{{ page }} / {{ ticketsData.pagination.totalPages }}</span>
        <button
          @click="page++"
          :disabled="page >= ticketsData.pagination.totalPages"
          class="btn btn-outline text-sm"
        >
          ถัดไป <Icon name="ph:caret-right" />
        </button>
      </div>
    </div>
  </div>
</template>
