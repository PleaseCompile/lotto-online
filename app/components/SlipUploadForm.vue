<script setup lang="ts">
const props = defineProps<{
  orderId: string
}>()

const uploading = ref(false)
const uploaded = ref(false)
const error = ref('')
const slipPreview = ref('')

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Validate
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    error.value = 'รองรับเฉพาะไฟล์ JPEG, PNG, WebP'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'ไฟล์ใหญ่เกิน 5MB'
    return
  }

  error.value = ''
  slipPreview.value = URL.createObjectURL(file)
}

async function uploadSlip() {
  const input = document.getElementById('slip-file') as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return

  uploading.value = true
  error.value = ''

  try {
    const formData = new FormData()
    formData.append('slip', file)

    const response = await $fetch(`/api/payments/${props.orderId}/upload-slip`, {
      method: 'POST',
      body: formData,
    })

    uploaded.value = true
  } catch (err: any) {
    error.value = err.data?.message || 'อัปโหลดไม่สำเร็จ'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="uploaded" class="bg-success/10 text-success p-4 rounded-lg text-center">
      <Icon name="ph:check-circle-fill" class="text-3xl mb-2" />
      <p class="font-medium">อัปโหลดสลิปเรียบร้อย</p>
      <p class="text-sm mt-1">ระบบกำลังตรวจสอบ จะแจ้งผลภายในไม่กี่นาที</p>
    </div>

    <div v-else class="space-y-4">
      <div v-if="error" class="bg-danger/10 text-danger text-sm p-3 rounded-lg">
        {{ error }}
      </div>

      <div class="border-2 border-dashed border-[var(--color-border)] rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
        <input
          id="slip-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="onFileSelect"
        />

        <div v-if="slipPreview" class="space-y-3">
          <img :src="slipPreview" alt="Slip preview" class="max-h-64 mx-auto rounded-lg" />
          <label for="slip-file" class="text-sm text-primary cursor-pointer hover:underline">
            เปลี่ยนรูป
          </label>
        </div>

        <label v-else for="slip-file" class="cursor-pointer block">
          <Icon name="ph:upload-simple" class="text-4xl text-[var(--color-text-muted)] mb-2" />
          <p class="text-sm text-[var(--color-text-muted)]">คลิกเพื่อเลือกรูปสลิป</p>
          <p class="text-xs text-[var(--color-text-muted)] mt-1">JPEG, PNG, WebP (สูงสุด 5MB)</p>
        </label>
      </div>

      <button
        v-if="slipPreview"
        @click="uploadSlip"
        :disabled="uploading"
        class="btn btn-primary w-full"
      >
        <Icon v-if="uploading" name="ph:spinner" class="animate-spin mr-1" />
        <Icon v-else name="ph:paper-plane-tilt-fill" class="mr-1" />
        {{ uploading ? 'กำลังอัปโหลด...' : 'ส่งสลิป' }}
      </button>
    </div>
  </div>
</template>
