<script setup lang="ts">
import type { ScanResult } from '~/composables/useBarcodeScanner'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

useSeoMeta({ title: 'นำเข้าลอตเตอรี่' })

const { isScanning, lastResult, error: scanError, startScanning, stopScanning } = useBarcodeScanner()

const supabase = useSupabaseClient()

// Load draws for selection
const { data: draws } = await useAsyncData('admin-draws', async () => {
  const { data } = await supabase
    .from('lottery_draws')
    .select('id, draw_date, status')
    .in('status', ['upcoming', 'selling'])
    .order('draw_date', { ascending: false })
  return data || []
})

const selectedDrawId = ref('')
const price = ref(80)
const scannedItems = ref<Array<{
  barcode_raw: string
  ticketNumber: string
  setNumber: string
  price: number
  status: 'pending' | 'success' | 'error'
  message?: string
}>>([])

const isSubmitting = ref(false)
const successMessage = ref('')

function onScan(result: ScanResult) {
  // Play beep sound
  playBeep()

  // Check duplicate in current batch
  const exists = scannedItems.value.find(
    (item) => item.ticketNumber === result.ticketNumber && item.barcode_raw === result.rawValue
  )
  if (exists) return

  scannedItems.value.unshift({
    barcode_raw: result.rawValue,
    ticketNumber: result.ticketNumber,
    setNumber: result.setNumber,
    price: price.value * 100, // Convert to satang
    status: 'pending',
  })
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 1200
    osc.type = 'sine'
    gain.gain.value = 0.3
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // Audio not supported
  }
}

function removeItem(index: number) {
  scannedItems.value.splice(index, 1)
}

async function submitSingle(index: number) {
  const item = scannedItems.value[index]
  if (!selectedDrawId.value) return

  item.status = 'pending'
  try {
    const { data, error } = await useFetch('/api/admin/tickets/scan', {
      method: 'POST',
      body: {
        barcode_raw: item.barcode_raw,
        draw_id: selectedDrawId.value,
        price: item.price,
      },
    })
    if (error.value) {
      item.status = 'error'
      item.message = error.value.data?.message || 'เกิดข้อผิดพลาด'
    } else {
      item.status = 'success'
      item.message = 'นำเข้าสำเร็จ'
    }
  } catch {
    item.status = 'error'
    item.message = 'เกิดข้อผิดพลาด'
  }
}

async function submitAll() {
  if (!selectedDrawId.value || scannedItems.value.length === 0) return

  isSubmitting.value = true
  successMessage.value = ''

  const pendingItems = scannedItems.value.filter((item) => item.status === 'pending')

  const { data, error } = await useFetch('/api/admin/tickets/bulk-scan', {
    method: 'POST',
    body: {
      draw_id: selectedDrawId.value,
      items: pendingItems.map((item) => ({
        barcode_raw: item.barcode_raw,
        price: item.price,
      })),
    },
  })

  if (!error.value && data.value) {
    const results = (data.value as any).data.results
    let successIdx = 0
    for (const item of pendingItems) {
      const result = results[successIdx]
      if (result) {
        item.status = result.success ? 'success' : 'error'
        item.message = result.success ? 'นำเข้าสำเร็จ' : result.error
      }
      successIdx++
    }
    successMessage.value = `นำเข้าสำเร็จ ${(data.value as any).data.success_count} ใบ จาก ${(data.value as any).data.total} ใบ`
  }

  isSubmitting.value = false
}

function clearDone() {
  scannedItems.value = scannedItems.value.filter((item) => item.status === 'pending')
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function toggleScanner() {
  if (isScanning.value) {
    stopScanning()
  } else {
    startScanning('barcode-video', onScan)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">นำเข้าลอตเตอรี่</h1>
        <p class="text-sm text-[var(--color-text-muted)] mt-1">สแกน barcode หรือเพิ่มด้วยตนเอง</p>
      </div>
      <NuxtLink to="/admin/tickets" class="btn btn-outline text-sm">
        <Icon name="ph:list" class="mr-1" />
        จัดการลอตเตอรี่
      </NuxtLink>
    </div>

    <!-- Settings -->
    <div class="card p-5 space-y-4">
      <h2 class="font-semibold">ตั้งค่านำเข้า</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">งวดวันที่ <span class="text-danger">*</span></label>
          <select v-model="selectedDrawId" class="input">
            <option value="">-- เลือกงวด --</option>
            <option v-for="draw in draws" :key="draw.id" :value="draw.id">
              {{ formatDate(draw.draw_date) }} ({{ draw.status }})
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">ราคาขาย (บาท)</label>
          <input v-model.number="price" type="number" min="1" class="input" placeholder="80" />
        </div>
      </div>
    </div>

    <!-- Scanner -->
    <div class="card p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">กล้องสแกน Barcode</h2>
        <button @click="toggleScanner" :class="isScanning ? 'btn-danger' : 'btn-primary'" class="btn text-sm">
          <Icon :name="isScanning ? 'ph:stop-fill' : 'ph:camera-fill'" class="mr-1" />
          {{ isScanning ? 'หยุดสแกน' : 'เปิดกล้อง' }}
        </button>
      </div>

      <div v-if="scanError" class="bg-danger/10 text-danger text-sm p-3 rounded-lg">
        <Icon name="ph:warning-fill" class="mr-1" /> {{ scanError }}
      </div>

      <div v-show="isScanning" class="relative w-full max-w-lg mx-auto">
        <video id="barcode-video" class="w-full rounded-xl border-2 border-primary/30" autoplay muted playsinline />
        <!-- Viewfinder overlay -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="w-3/4 h-16 border-2 border-primary rounded-lg opacity-60" />
        </div>
        <p class="text-center text-xs text-[var(--color-text-muted)] mt-2">
          วางสลากให้ barcode อยู่ในกรอบ
        </p>
      </div>

      <!-- Manual input -->
      <div class="border-t border-[var(--color-border)] pt-4">
        <h3 class="text-sm font-medium mb-2">เพิ่มด้วยตนเอง</h3>
        <ManualTicketInput
          :draw-id="selectedDrawId"
          :default-price="price * 100"
          @added="(item: any) => scannedItems.unshift(item)"
        />
      </div>
    </div>

    <!-- Scanned items -->
    <div class="card p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">
          รายการสแกน
          <span class="text-sm font-normal text-[var(--color-text-muted)]">({{ scannedItems.length }} ใบ)</span>
        </h2>
        <div class="flex gap-2">
          <button v-if="scannedItems.some((i) => i.status !== 'pending')" @click="clearDone" class="btn btn-ghost text-sm">
            ลบที่เสร็จแล้ว
          </button>
          <button
            @click="submitAll"
            :disabled="!selectedDrawId || scannedItems.length === 0 || isSubmitting"
            class="btn btn-primary text-sm"
          >
            <Icon v-if="isSubmitting" name="ph:spinner" class="animate-spin mr-1" />
            <Icon v-else name="ph:upload-fill" class="mr-1" />
            นำเข้าทั้งหมด
          </button>
        </div>
      </div>

      <div v-if="successMessage" class="bg-success/10 text-success text-sm p-3 rounded-lg">
        <Icon name="ph:check-circle-fill" class="mr-1" /> {{ successMessage }}
      </div>

      <div v-if="scannedItems.length === 0" class="text-center py-8 text-[var(--color-text-muted)]">
        <Icon name="ph:barcode" class="text-4xl mb-2" /><br />
        ยังไม่มีรายการ — เริ่มสแกนเลย
      </div>

      <div v-else class="divide-y divide-[var(--color-border)]">
        <div
          v-for="(item, index) in scannedItems"
          :key="index"
          class="flex items-center gap-4 py-3"
        >
          <div class="w-10 h-10 rounded-lg flex items-center justify-center"
            :class="{
              'bg-warning/10 text-warning': item.status === 'pending',
              'bg-success/10 text-success': item.status === 'success',
              'bg-danger/10 text-danger': item.status === 'error',
            }"
          >
            <Icon
              :name="
                item.status === 'pending'
                  ? 'ph:clock'
                  : item.status === 'success'
                    ? 'ph:check-circle-fill'
                    : 'ph:x-circle-fill'
              "
              class="text-xl"
            />
          </div>

          <div class="flex-1 min-w-0">
            <p class="font-mono text-lg font-bold tracking-widest">{{ item.ticketNumber }}</p>
            <p class="text-xs text-[var(--color-text-muted)]">
              ชุด {{ item.setNumber || '-' }} · ฿{{ (item.price / 100).toFixed(0) }}
              <span v-if="item.message" class="ml-1">· {{ item.message }}</span>
            </p>
          </div>

          <div class="flex gap-1">
            <button
              v-if="item.status === 'pending'"
              @click="submitSingle(index)"
              class="p-2 text-primary hover:bg-primary/10 rounded"
              title="นำเข้า"
            >
              <Icon name="ph:upload" />
            </button>
            <button
              v-if="item.status !== 'success'"
              @click="removeItem(index)"
              class="p-2 text-danger hover:bg-danger/10 rounded"
              title="ลบ"
            >
              <Icon name="ph:trash" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
