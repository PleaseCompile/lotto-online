<script setup lang="ts">
import type { OrderItem, Ticket } from '~/types/database'

definePageMeta({
  middleware: ['auth'],
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const { data: safeTickets, pending, refresh } = await useAsyncData('safe', async () => {
  if (!user.value) return []
  const { data } = await supabase
    .from('order_items')
    .select(`
      *,
      tickets(id, ticket_number, set_number, watermarked_url, image_url, draw_id, status,
        lottery_draws(id, draw_date_thai, draw_date, status)
      ),
      orders!inner(user_id, status)
    `)
    .eq('orders.user_id', user.value.id)
    .eq('orders.status', 'paid')
    .order('created_at', { ascending: false })
  return data || []
})

// Prize claims for user
const { data: prizeClaims } = await useAsyncData('prize-claims', async () => {
  if (!user.value) return []
  const { data } = await supabase
    .from('prize_claims')
    .select('*')
    .eq('user_id', user.value.id)
  return data || []
})

const prizeStatusLabel: Record<string, string> = {
  unchecked: 'ยังไม่ตรวจ',
  no_prize: 'ไม่ถูกรางวัล',
  won: 'ถูกรางวัล!',
  claimed: 'รอขึ้นเงิน',
  paid_out: 'จ่ายแล้ว',
}

const prizeStatusColor: Record<string, string> = {
  unchecked: 'badge-warning',
  no_prize: '',
  won: 'badge-success',
  claimed: 'badge-success',
  paid_out: 'badge-success',
}

const checking = ref<string | null>(null)
const claiming = ref<string | null>(null)

async function checkPrizes(drawId: string) {
  checking.value = drawId
  try {
    await $fetch(`/api/prizes/check/${drawId}`)
    await refresh()
  } catch (err: any) {
    alert(err.data?.message || 'ตรวจรางวัลไม่สำเร็จ')
  } finally {
    checking.value = null
  }
}

function getClaimForTicket(ticketId: string) {
  return prizeClaims.value?.find((c: any) => c.ticket_id === ticketId)
}

async function claimPrize(claimId: string) {
  claiming.value = claimId
  try {
    await $fetch(`/api/prizes/claim/${claimId}`, { method: 'POST' })
    await refresh()
  } catch (err: any) {
    alert(err.data?.message || 'ขึ้นเงินไม่สำเร็จ')
  } finally {
    claiming.value = null
  }
}

const formatPrice = (satang: number) => new Intl.NumberFormat('th-TH').format(satang / 100)

// Group tickets by draw
const ticketsByDraw = computed(() => {
  const groups: Record<string, { draw: any; items: any[] }> = {}
  for (const item of safeTickets.value || []) {
    const t = (item as any).tickets
    const drawId = t?.lottery_draws?.id || t?.draw_id
    if (!groups[drawId]) {
      groups[drawId] = { draw: t?.lottery_draws, items: [] }
    }
    groups[drawId].items.push(item)
  }
  return Object.entries(groups).sort(([, a], [, b]) =>
    new Date(b.draw?.draw_date || 0).getTime() - new Date(a.draw?.draw_date || 0).getTime()
  )
})

useSeoMeta({
  title: 'ตู้เซฟของฉัน — ลอตโต้ออนไลน์',
})
</script>

<template>
  <div class="page-container">
    <h1 class="text-2xl font-bold mb-6">
      <Icon name="ph:vault" class="text-primary" />
      ตู้เซฟของฉัน
    </h1>

    <!-- Loading -->
    <div v-if="pending" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div v-for="i in 6" :key="i" class="card p-4">
        <SkeletonLoader height="2rem" class="mb-2" />
        <SkeletonLoader height="1rem" width="60%" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!safeTickets?.length" class="text-center py-20">
      <Icon name="ph:vault" class="text-5xl text-[var(--color-text-muted)] mb-3" />
      <p class="text-[var(--color-text-muted)] mb-4">ตู้เซฟของคุณยังว่างอยู่</p>
      <NuxtLink to="/tickets" class="btn-primary">
        ซื้อลอตเตอรี่
      </NuxtLink>
    </div>

    <!-- Tickets Grouped by Draw -->
    <div v-else class="space-y-6">
      <div v-for="[drawId, group] in ticketsByDraw" :key="drawId">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">
            <Icon name="ph:calendar" class="text-primary" />
            งวด {{ group.draw?.draw_date_thai || 'ไม่ระบุ' }}
          </h2>
          <button
            v-if="group.items.some((i: any) => i.prize_status === 'unchecked') && group.draw?.status === 'resulted'"
            class="btn-primary text-sm"
            :disabled="checking === drawId"
            @click="checkPrizes(drawId)"
          >
            <Icon v-if="checking === drawId" name="ph:spinner" class="animate-spin" />
            <Icon v-else name="ph:magnifying-glass" />
            ตรวจรางวัล
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div
            v-for="item in group.items"
            :key="item.id"
            class="card p-4 text-center"
            :class="{ 'ring-2 ring-primary shadow-glow': item.prize_status === 'won' }"
          >
            <p class="text-xl font-mono font-bold tracking-wider">
              {{ (item as any).tickets?.ticket_number }}
            </p>
            <p class="text-xs text-[var(--color-text-muted)] mt-1">
              ชุดที่ {{ (item as any).tickets?.set_number || '-' }}
            </p>
            <span
              class="badge mt-2"
              :class="prizeStatusColor[item.prize_status] || ''"
            >
              {{ prizeStatusLabel[item.prize_status] || item.prize_status }}
            </span>

            <!-- Prize details for won tickets -->
            <template v-if="item.prize_status === 'won' || item.prize_status === 'claimed' || item.prize_status === 'paid_out'">
              <div v-if="getClaimForTicket((item as any).tickets?.id)" class="mt-2 text-xs">
                <p class="text-success font-semibold">
                  ฿{{ formatPrice(getClaimForTicket((item as any).tickets?.id)?.net_amount || 0) }}
                </p>
                <button
                  v-if="getClaimForTicket((item as any).tickets?.id)?.status === 'pending'"
                  class="btn-primary text-xs mt-2 w-full"
                  :disabled="claiming === getClaimForTicket((item as any).tickets?.id)?.id"
                  @click="claimPrize(getClaimForTicket((item as any).tickets?.id)?.id)"
                >
                  ขึ้นเงินรางวัล
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
