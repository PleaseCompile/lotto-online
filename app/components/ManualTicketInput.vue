<script setup lang="ts">
const emit = defineEmits<{
  added: [item: {
    barcode_raw: string
    ticketNumber: string
    setNumber: string
    price: number
    status: 'pending'
  }]
}>()

const props = defineProps<{
  drawId: string
  defaultPrice: number
}>()

const ticketNumber = ref('')
const setNumber = ref('1')

function addManual() {
  if (!/^\d{6}$/.test(ticketNumber.value)) return

  emit('added', {
    barcode_raw: `MANUAL:${ticketNumber.value}`,
    ticketNumber: ticketNumber.value,
    setNumber: setNumber.value || '1',
    price: props.defaultPrice,
    status: 'pending',
  })

  ticketNumber.value = ''
}
</script>

<template>
  <div class="flex items-end gap-3">
    <div class="flex-1">
      <label class="block text-xs text-[var(--color-text-muted)] mb-1">เลข 6 หลัก</label>
      <input
        v-model="ticketNumber"
        type="text"
        maxlength="6"
        pattern="\d{6}"
        class="input font-mono tracking-widest"
        placeholder="123456"
        @keyup.enter="addManual"
      />
    </div>
    <div class="w-20">
      <label class="block text-xs text-[var(--color-text-muted)] mb-1">ชุดที่</label>
      <input v-model="setNumber" type="text" maxlength="3" class="input" placeholder="1" />
    </div>
    <button @click="addManual" :disabled="!/^\d{6}$/.test(ticketNumber)" class="btn btn-secondary text-sm">
      <Icon name="ph:plus" class="mr-1" /> เพิ่ม
    </button>
  </div>
</template>
