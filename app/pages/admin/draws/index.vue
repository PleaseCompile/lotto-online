<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

useSeoMeta({ title: 'จัดการงวดลอตเตอรี่' })

const supabase = useSupabaseClient()

const { data: draws, refresh } = await useAsyncData('admin-draws-list', async () => {
  const { data } = await supabase
    .from('lottery_draws')
    .select('*')
    .order('draw_date', { ascending: false })
  return data || []
})

const showCreateForm = ref(false)
const newDrawDate = ref('')
const creating = ref(false)

async function createDraw() {
  if (!newDrawDate.value) return
  creating.value = true

  try {
    await $fetch('/api/admin/draws', {
      method: 'POST',
      body: { draw_date: newDrawDate.value },
    })
    showCreateForm.value = false
    newDrawDate.value = ''
    await refresh()
  } catch (err: any) {
    alert(err.data?.message || 'สร้างงวดไม่สำเร็จ')
  } finally {
    creating.value = false
  }
}

async function updateStatus(id: string, status: string) {
  try {
    await $fetch(`/api/admin/draws/${id}`, {
      method: 'PUT',
      body: { status },
    })
    await refresh()
  } catch (err: any) {
    alert(err.data?.message || 'อัปเดตไม่สำเร็จ')
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    upcoming: 'กำลังจะมาถึง',
    selling: 'เปิดขาย',
    closed: 'ปิดขาย',
    resulted: 'ออกผลแล้ว',
  }
  return map[s] || s
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    upcoming: 'badge-warning',
    selling: 'badge-success',
    closed: 'badge-danger',
    resulted: 'badge-primary',
  }
  return map[s] || ''
}

const statusActions: Record<string, Array<{ label: string; value: string; icon: string }>> = {
  upcoming: [{ label: 'เปิดขาย', value: 'selling', icon: 'ph:shopping-cart' }],
  selling: [{ label: 'ปิดขาย', value: 'closed', icon: 'ph:lock' }],
  closed: [
    { label: 'เปิดขายอีก', value: 'selling', icon: 'ph:shopping-cart' },
    { label: 'ออกผลแล้ว', value: 'resulted', icon: 'ph:trophy' },
  ],
  resulted: [],
}

const fetchingResults = ref<string | null>(null)
const checkingPrizes = ref<string | null>(null)

async function fetchResults(drawId: string) {
  fetchingResults.value = drawId
  try {
    const res = await $fetch<any>(`/api/admin/draws/${drawId}/fetch-results`, { method: 'POST' })
    alert(res.data?.message || 'ดึงผลรางวัลเรียบร้อย')
    await refresh()
  } catch (err: any) {
    alert(err.data?.message || 'ดึงผลรางวัลไม่สำเร็จ')
  } finally {
    fetchingResults.value = null
  }
}

async function checkPrizes(drawId: string) {
  checkingPrizes.value = drawId
  try {
    const res = await $fetch<any>(`/api/admin/draws/${drawId}/check-prizes`, { method: 'POST' })
    alert(res.data?.message || 'เริ่มตรวจรางวัลแล้ว')
  } catch (err: any) {
    alert(err.data?.message || 'ไม่สามารถตรวจรางวัลได้')
  } finally {
    checkingPrizes.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1 class="text-2xl font-bold">จัดการงวด</h1>
      <button @click="showCreateForm = !showCreateForm" class="btn btn-primary text-sm">
        <Icon name="ph:plus" class="mr-1" />
        สร้างงวดใหม่
      </button>
    </div>

    <!-- Create form -->
    <Transition name="slide-down">
      <div v-if="showCreateForm" class="card p-5 space-y-4">
        <h2 class="font-semibold">สร้างงวดใหม่</h2>
        <div class="flex items-end gap-3">
          <div class="flex-1">
            <label class="block text-sm font-medium mb-1">วันที่ออกรางวัล</label>
            <input v-model="newDrawDate" type="date" class="input" />
          </div>
          <button @click="createDraw" :disabled="!newDrawDate || creating" class="btn btn-primary">
            <Icon v-if="creating" name="ph:spinner" class="animate-spin mr-1" />
            สร้าง
          </button>
          <button @click="showCreateForm = false" class="btn btn-ghost">ยกเลิก</button>
        </div>
      </div>
    </Transition>

    <!-- Draws list -->
    <div class="space-y-3">
      <div v-for="draw in draws" :key="draw.id" class="card p-5">
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="ph:calendar" class="text-primary text-xl" />
              </div>
              <div>
                <p class="font-semibold">{{ formatDate(draw.draw_date) }}</p>
                <span class="badge text-xs" :class="statusColor(draw.status)">
                  {{ statusLabel(draw.status) }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="action in statusActions[draw.status] || []"
              :key="action.value"
              @click="updateStatus(draw.id, action.value)"
              class="btn btn-outline text-sm"
            >
              <Icon :name="action.icon" class="mr-1" />
              {{ action.label }}
            </button>

            <!-- Fetch Results (for closed draws) -->
            <button
              v-if="draw.status === 'closed' || draw.status === 'resulted'"
              @click="fetchResults(draw.id)"
              :disabled="fetchingResults === draw.id"
              class="btn btn-outline text-sm text-primary border-primary"
            >
              <Icon v-if="fetchingResults === draw.id" name="ph:spinner" class="animate-spin mr-1" />
              <Icon v-else name="ph:download" class="mr-1" />
              ดึงผลรางวัล
            </button>

            <!-- Check Prizes (for resulted draws) -->
            <button
              v-if="draw.status === 'resulted'"
              @click="checkPrizes(draw.id)"
              :disabled="checkingPrizes === draw.id"
              class="btn btn-outline text-sm text-warning border-warning"
            >
              <Icon v-if="checkingPrizes === draw.id" name="ph:spinner" class="animate-spin mr-1" />
              <Icon v-else name="ph:magnifying-glass" class="mr-1" />
              ตรวจรางวัล
            </button>
          </div>
        </div>
      </div>

      <div v-if="!draws?.length" class="text-center py-12 text-[var(--color-text-muted)]">
        <Icon name="ph:calendar-blank" class="text-4xl mb-2" /><br />
        ยังไม่มีงวด
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
