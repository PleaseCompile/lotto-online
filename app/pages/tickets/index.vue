<script setup lang="ts">
import type { Ticket } from '~/types/database'
import type { TicketSearchParams } from '~/types/api'

const supabase = useSupabaseClient()
const route = useRoute()

const searchQuery = ref((route.query.q as string) || '')
const suffix2 = ref((route.query.suffix2 as string) || '')
const suffix3 = ref((route.query.suffix3 as string) || '')
const sortBy = ref('price_asc')
const page = ref(1)
const limit = 24

const tickets = ref<Ticket[]>([])
const totalCount = ref(0)
const loading = ref(false)

const fetchTickets = async () => {
  loading.value = true

  try {
    let query = supabase
      .from('tickets')
      .select('*', { count: 'exact' })
      .eq('status', 'available')

    if (searchQuery.value) {
      query = query.eq('ticket_number', searchQuery.value)
    }
    if (suffix2.value) {
      query = query.like('ticket_number', `%${suffix2.value}`)
    }
    if (suffix3.value) {
      query = query.like('ticket_number', `%${suffix3.value}`)
    }

    // Sort
    if (sortBy.value === 'price_asc') {
      query = query.order('price', { ascending: true })
    } else if (sortBy.value === 'price_desc') {
      query = query.order('price', { ascending: false })
    } else if (sortBy.value === 'number_asc') {
      query = query.order('ticket_number', { ascending: true })
    }

    // Pagination
    const from = (page.value - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, count } = await query

    tickets.value = (data || []) as Ticket[]
    totalCount.value = count || 0
  } finally {
    loading.value = false
  }
}

const totalPages = computed(() => Math.ceil(totalCount.value / limit))

const formatPrice = (satang: number) => {
  return new Intl.NumberFormat('th-TH').format(satang / 100)
}

const handleSearch = () => {
  page.value = 1
  fetchTickets()
}

const clearFilters = () => {
  searchQuery.value = ''
  suffix2.value = ''
  suffix3.value = ''
  page.value = 1
  fetchTickets()
}

watch(() => route.query, () => {
  searchQuery.value = (route.query.q as string) || ''
  suffix2.value = (route.query.suffix2 as string) || ''
  suffix3.value = (route.query.suffix3 as string) || ''
  page.value = 1
  fetchTickets()
}, { immediate: true })

useSeoMeta({
  title: 'ซื้อลอตเตอรี่ — ลอตโต้ออนไลน์',
})
</script>

<template>
  <div class="page-container">
    <h1 class="text-2xl font-bold mb-6">ซื้อลอตเตอรี่</h1>

    <!-- Filters -->
    <div class="card p-4 mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div class="lg:col-span-2">
          <label class="block text-xs font-medium text-[var(--color-text-muted)] mb-1">ค้นหาเลข 6 หลัก</label>
          <input
            v-model="searchQuery"
            type="text"
            class="input"
            placeholder="833009"
            maxlength="6"
            inputmode="numeric"
            @keyup.enter="handleSearch"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--color-text-muted)] mb-1">เลขท้าย 2 ตัว</label>
          <input
            v-model="suffix2"
            type="text"
            class="input"
            placeholder="09"
            maxlength="2"
            inputmode="numeric"
            @keyup.enter="handleSearch"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--color-text-muted)] mb-1">เลขท้าย 3 ตัว</label>
          <input
            v-model="suffix3"
            type="text"
            class="input"
            placeholder="009"
            maxlength="3"
            inputmode="numeric"
            @keyup.enter="handleSearch"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--color-text-muted)] mb-1">เรียงลำดับ</label>
          <select v-model="sortBy" class="input" @change="handleSearch">
            <option value="price_asc">ราคาน้อย → มาก</option>
            <option value="price_desc">ราคามาก → น้อย</option>
            <option value="number_asc">เลข น้อย → มาก</option>
          </select>
        </div>
      </div>
      <div class="flex items-center gap-2 mt-3">
        <UiButton variant="primary" size="sm" @click="handleSearch">
          <Icon name="ph:magnifying-glass" />
          ค้นหา
        </UiButton>
        <UiButton variant="ghost" size="sm" @click="clearFilters">
          ล้างตัวกรอง
        </UiButton>
        <span class="ml-auto text-xs text-[var(--color-text-muted)]">
          พบ {{ totalCount.toLocaleString('th-TH') }} รายการ
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div v-for="i in 24" :key="i" class="card p-4">
        <SkeletonLoader height="2rem" class="mb-2" />
        <SkeletonLoader height="1rem" width="60%" />
      </div>
    </div>

    <!-- Tickets Grid -->
    <div v-else-if="tickets.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <NuxtLink
        v-for="ticket in tickets"
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
        <span class="badge-success mt-2">ว่าง</span>
      </NuxtLink>
    </div>

    <!-- Empty -->
    <div v-else class="text-center py-20">
      <Icon name="ph:magnifying-glass" class="text-5xl text-[var(--color-text-muted)] mb-3" />
      <p class="text-[var(--color-text-muted)]">ไม่พบลอตเตอรี่ที่ตรงกับการค้นหา</p>
      <UiButton variant="outline" size="sm" class="mt-3" @click="clearFilters">
        ล้างตัวกรอง
      </UiButton>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-8">
      <UiButton
        variant="outline"
        size="sm"
        :disabled="page <= 1"
        @click="page--; fetchTickets()"
      >
        <Icon name="ph:caret-left" />
      </UiButton>
      <span class="text-sm">
        หน้า {{ page }} / {{ totalPages }}
      </span>
      <UiButton
        variant="outline"
        size="sm"
        :disabled="page >= totalPages"
        @click="page++; fetchTickets()"
      >
        <Icon name="ph:caret-right" />
      </UiButton>
    </div>
  </div>
</template>
