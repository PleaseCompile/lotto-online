<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  checkout: []
}>()

const supabase = useSupabaseClient()
const user = useSupabaseUser()

interface CartItemWithCountdown {
  id: string
  ticket_id: string
  expires_at: string
  countdown_seconds: number
  tickets: {
    id: string
    number: string
    set_number: string
    price: number
    lottery_draws: {
      draw_date: string
    }
  }
}

const items = ref<CartItemWithCountdown[]>([])
const loading = ref(false)
const removing = ref<string | null>(null)

async function fetchCart() {
  if (!user.value) return
  loading.value = true

  try {
    const { data } = await useFetch('/api/cart')
    if (data.value) {
      items.value = (data.value as any).data || []
    }
  } finally {
    loading.value = false
  }
}

// Countdown timer
let interval: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  if (interval) clearInterval(interval)
  interval = setInterval(() => {
    for (const item of items.value) {
      if (item.countdown_seconds > 0) {
        item.countdown_seconds--
      }
    }
    // Remove expired items
    const expired = items.value.filter((i) => i.countdown_seconds <= 0)
    if (expired.length > 0) {
      items.value = items.value.filter((i) => i.countdown_seconds > 0)
    }
  }, 1000)
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function removeItem(ticketId: string) {
  removing.value = ticketId
  try {
    await $fetch(`/api/cart/${ticketId}`, { method: 'DELETE' })
    items.value = items.value.filter((i) => i.ticket_id !== ticketId)
  } finally {
    removing.value = null
  }
}

const total = computed(() => {
  return items.value.reduce((sum, item) => sum + (item.tickets?.price || 0), 0)
})

watch(() => props.open, (val) => {
  if (val) {
    fetchCart()
    startCountdown()
  } else if (interval) {
    clearInterval(interval)
  }
})

onBeforeUnmount(() => {
  if (interval) clearInterval(interval)
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 bg-black/50 z-40" @click="emit('close')" />
    </Transition>

    <Transition name="slide-right">
      <div
        v-if="open"
        class="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[var(--color-surface)] shadow-xl z-50 flex flex-col"
      >
        <!-- Header -->
        <div class="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 class="text-lg font-bold flex items-center gap-2">
            <Icon name="ph:shopping-cart-fill" class="text-primary" />
            ตะกร้า
            <span class="text-sm font-normal text-[var(--color-text-muted)]">({{ items.length }})</span>
          </h2>
          <button @click="emit('close')" class="p-2 hover:bg-[var(--color-surface-alt)] rounded-lg">
            <Icon name="ph:x" class="text-xl" />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="loading" class="space-y-4">
            <SkeletonLoader v-for="i in 3" :key="i" height="80px" rounded />
          </div>

          <div v-else-if="items.length === 0" class="text-center py-12 text-[var(--color-text-muted)]">
            <Icon name="ph:shopping-cart" class="text-5xl mb-3" />
            <p>ตะกร้าว่าง</p>
            <NuxtLink to="/tickets" @click="emit('close')" class="text-primary text-sm mt-2 inline-block">
              ค้นหาลอตเตอรี่
            </NuxtLink>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="item in items"
              :key="item.id"
              class="card p-4 flex items-center gap-3"
            >
              <div class="flex-1 min-w-0">
                <p class="font-mono text-lg font-bold tracking-widest">
                  {{ item.tickets.number }}
                </p>
                <p class="text-xs text-[var(--color-text-muted)]">
                  ชุด {{ item.tickets.set_number }}
                  <span v-if="item.tickets.lottery_draws">
                    · {{ formatDate(item.tickets.lottery_draws.draw_date) }}
                  </span>
                </p>
                <p class="text-sm font-semibold text-primary mt-1">
                  ฿{{ (item.tickets.price / 100).toLocaleString('th-TH') }}
                </p>
              </div>

              <div class="text-right">
                <div
                  class="text-xs font-mono px-2 py-1 rounded"
                  :class="item.countdown_seconds < 120 ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'"
                >
                  <Icon name="ph:timer" class="mr-0.5" />
                  {{ formatCountdown(item.countdown_seconds) }}
                </div>
                <button
                  @click="removeItem(item.ticket_id)"
                  :disabled="removing === item.ticket_id"
                  class="mt-2 text-xs text-danger hover:text-danger/80"
                >
                  <Icon v-if="removing === item.ticket_id" name="ph:spinner" class="animate-spin" />
                  <Icon v-else name="ph:trash" />
                  ลบ
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="items.length > 0" class="p-4 border-t border-[var(--color-border)] space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[var(--color-text-muted)]">รวมทั้งสิ้น</span>
            <span class="text-xl font-bold text-primary">
              ฿{{ (total / 100).toLocaleString('th-TH') }}
            </span>
          </div>
          <div class="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
            <Icon name="ph:warning" class="text-warning" />
            สินค้าจะถูกปลดจองหลังหมดเวลา 15 นาที
          </div>
          <NuxtLink
            to="/cart"
            @click="emit('close')"
            class="btn btn-primary w-full"
          >
            <Icon name="ph:credit-card" class="mr-1" />
            ดำเนินการชำระเงิน
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
