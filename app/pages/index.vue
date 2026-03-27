<script setup lang="ts">
import type { LotteryDraw, Ticket } from '~/types/database'

const config = useRuntimeConfig()
const supabase = useSupabaseClient()

// Fetch current selling draw
const { data: currentDraw } = await useAsyncData('current-draw', async () => {
  const { data } = await supabase
    .from('lottery_draws')
    .select('*')
    .eq('status', 'selling')
    .order('draw_date', { ascending: false })
    .limit(1)
    .single()
  return data as LotteryDraw | null
})

// Fetch featured tickets
const { data: featuredTickets, pending: ticketsLoading } = await useAsyncData('featured-tickets', async () => {
  if (!currentDraw.value) return []
  const { data } = await supabase
    .from('tickets')
    .select('*')
    .eq('draw_id', currentDraw.value.id)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(12)
  return (data || []) as Ticket[]
})

// Stats (mock until we have real data)
const stats = ref({
  totalTickets: 0,
  soldToday: 0,
  totalPrizesPaid: 0,
})

// Search
const searchQuery = ref('')
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    navigateTo({ path: '/tickets', query: { q: searchQuery.value.trim() } })
  }
}

// Format price from satang to baht
const formatPrice = (satang: number) => {
  return new Intl.NumberFormat('th-TH').format(satang / 100)
}

useSeoMeta({
  title: `${config.public.appName} — ซื้อสลากกินแบ่งรัฐบาลออนไลน์`,
  description: 'ซื้อสลากกินแบ่งรัฐบาลออนไลน์ ปลอดภัย ตรวจผลอัตโนมัติ ขึ้นเงินรางวัลได้ทันที',
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="relative bg-gradient-to-b from-secondary via-secondary-light to-secondary overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl" />
        <div class="absolute bottom-10 right-10 w-48 h-48 bg-primary rounded-full blur-3xl" />
      </div>
      <div class="page-container relative py-16 lg:py-24">
        <div class="max-w-2xl mx-auto text-center">
          <h1 class="text-3xl lg:text-5xl font-bold text-white leading-tight">
            ซื้อ<span class="text-primary">สลากกินแบ่ง</span>รัฐบาล<br />ออนไลน์
          </h1>
          <p class="mt-4 text-lg text-white/70">
            เลือกเลขที่ชอบ สั่งซื้อง่าย ตรวจรางวัลอัตโนมัติ ขึ้นเงินได้ทันที
          </p>

          <!-- Search Box -->
          <form @submit.prevent="handleSearch" class="mt-8 max-w-md mx-auto">
            <div class="relative">
              <Icon name="ph:magnifying-glass" class="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
              <input
                v-model="searchQuery"
                type="text"
                class="w-full pl-11 pr-24 py-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-lg"
                placeholder="ค้นหาเลข เช่น 123456"
                inputmode="numeric"
                maxlength="6"
              />
              <button
                type="submit"
                class="absolute right-2 top-1/2 -translate-y-1/2 btn-primary !py-2 !px-4 !text-sm"
              >
                ค้นหา
              </button>
            </div>
          </form>

          <!-- Quick Filters -->
          <div class="mt-4 flex flex-wrap justify-center gap-2">
            <NuxtLink
              v-for="suffix in ['00', '09', '19', '29', '39']"
              :key="suffix"
              :to="{ path: '/tickets', query: { suffix2: suffix } }"
              class="px-3 py-1.5 rounded-full text-sm bg-white/10 border border-white/20 text-white/80 hover:bg-primary/20 hover:border-primary/40 hover:text-white transition-colors"
            >
              เลขท้าย {{ suffix }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Current Draw Info -->
    <section v-if="currentDraw" class="page-container -mt-6 relative z-10">
      <div class="card p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon name="ph:calendar-check-fill" class="text-primary text-xl" />
          </div>
          <div>
            <p class="text-sm text-[var(--color-text-muted)]">งวดที่กำลังขาย</p>
            <p class="font-semibold">{{ currentDraw.draw_date_thai }}</p>
          </div>
        </div>
        <NuxtLink to="/tickets" class="btn-primary">
          <Icon name="ph:shopping-cart" />
          ซื้อเลย
        </NuxtLink>
      </div>
    </section>

    <!-- Featured Tickets -->
    <section class="page-container py-10">
      <div class="flex items-center justify-between mb-6">
        <h2 class="section-title">ลอตเตอรี่แนะนำ</h2>
        <NuxtLink to="/tickets" class="text-sm text-primary hover:underline font-medium">
          ดูทั้งหมด
          <Icon name="ph:arrow-right" />
        </NuxtLink>
      </div>

      <!-- Loading -->
      <div v-if="ticketsLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div v-for="i in 12" :key="i" class="card p-4">
          <SkeletonLoader height="2rem" class="mb-2" />
          <SkeletonLoader height="1rem" width="60%" />
        </div>
      </div>

      <!-- Tickets Grid -->
      <div v-else-if="featuredTickets?.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <NuxtLink
          v-for="ticket in featuredTickets"
          :key="ticket.id"
          :to="`/tickets/${ticket.id}`"
          class="card-hover p-4 text-center group"
        >
          <p class="text-xl lg:text-2xl font-mono font-bold tracking-wider text-secondary dark:text-primary group-hover:text-primary transition-colors">
            {{ ticket.ticket_number }}
          </p>
          <p v-if="ticket.set_number" class="text-xs text-[var(--color-text-muted)] mt-1">
            ชุดที่ {{ ticket.set_number }}
          </p>
          <p class="mt-2 text-sm font-semibold text-primary">
            {{ formatPrice(ticket.price) }} บาท
          </p>
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <Icon name="ph:ticket" class="text-5xl text-[var(--color-text-muted)] mb-3" />
        <p class="text-[var(--color-text-muted)]">ยังไม่มีลอตเตอรี่ในขณะนี้</p>
      </div>
    </section>

    <!-- How It Works -->
    <section class="bg-surface-alt dark:bg-surface-dark-alt py-16">
      <div class="page-container">
        <h2 class="section-title text-center mb-10">ซื้อง่ายใน 3 ขั้นตอน</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(step, i) in [
              { icon: 'ph:magnifying-glass-fill', title: 'เลือกเลข', desc: 'ค้นหาเลขที่ชอบ เลือกจากเลขดัง หรือเลขท้าย' },
              { icon: 'ph:shopping-cart-fill', title: 'หยิบใส่ตะกร้า', desc: 'ล็อกเลขให้คุณ 15 นาที ไม่มีใครแย่งได้' },
              { icon: 'ph:receipt-fill', title: 'ชำระเงิน', desc: 'โอนเงินแล้วส่งสลิป ระบบตรวจอัตโนมัติ' },
            ]"
            :key="i"
            class="text-center"
          >
            <div class="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon :name="step.icon" class="text-primary text-2xl" />
            </div>
            <h3 class="font-semibold mb-2">{{ step.title }}</h3>
            <p class="text-sm text-[var(--color-text-muted)] leading-relaxed">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="page-container py-16">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="feat in [
            { icon: 'ph:shield-check-fill', title: 'ปลอดภัย 100%', desc: 'สลากของแท้จากสำนักงานสลากฯ เก็บในตู้เซฟดิจิทัล' },
            { icon: 'ph:clock-fill', title: 'ตรวจผลอัตโนมัติ', desc: 'ระบบตรวจผลรางวัลให้ทุกงวด แจ้งเตือนทันทีเมื่อถูกรางวัล' },
            { icon: 'ph:wallet-fill', title: 'ขึ้นเงินรวดเร็ว', desc: 'ถูกรางวัลรับเงินเข้ากระเป๋าอัตโนมัติ ถอนเข้าบัญชีธนาคารได้ทันที' },
            { icon: 'ph:headset-fill', title: 'ซัพพอร์ตตลอด', desc: 'ทีมงานพร้อมช่วยเหลือคุณทุกขั้นตอน ตอบไวภายใน 5 นาที' },
          ]"
          :key="feat.title"
          class="flex items-start gap-3"
        >
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon :name="feat.icon" class="text-primary text-lg" />
          </div>
          <div>
            <h4 class="font-semibold text-sm">{{ feat.title }}</h4>
            <p class="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
