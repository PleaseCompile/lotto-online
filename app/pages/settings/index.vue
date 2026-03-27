<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const userId = useUserId()

const profile = ref<any>(null)
const loading = ref(true)
const saving = ref(false)

const form = reactive({
  full_name: '',
})

async function fetchProfile() {
  loading.value = true
  try {
    if (!user.value) return
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId.value)
      .single()
    profile.value = data
    if (data) {
      form.full_name = data.full_name || ''
    }
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (!user.value || !form.full_name.trim()) return
  saving.value = true
  try {
    await supabase
      .from('users')
      .update({ full_name: form.full_name.trim() })
      .eq('id', userId.value)
    await fetchProfile()
  } catch {
    alert('บันทึกไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}

await fetchProfile()

useSeoMeta({ title: 'ตั้งค่าบัญชี' })
</script>

<template>
  <div class="page-container max-w-2xl">
    <h1 class="text-2xl font-bold mb-6">
      <Icon name="ph:gear" class="text-primary" />
      ตั้งค่าบัญชี
    </h1>

    <div v-if="loading" class="space-y-4">
      <SkeletonLoader height="3rem" />
      <SkeletonLoader height="3rem" />
    </div>

    <div v-else class="space-y-6">
      <!-- Profile Card -->
      <div class="card p-6 space-y-4">
        <h2 class="font-semibold">ข้อมูลส่วนตัว</h2>
        <div>
          <label class="block text-sm font-medium mb-1">ชื่อ-นามสกุล</label>
          <input v-model="form.full_name" type="text" class="input w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">อีเมล</label>
          <input :value="user?.email || '-'" type="text" class="input w-full" disabled />
        </div>
        <UiButton variant="primary" :loading="saving" @click="saveProfile">
          บันทึก
        </UiButton>
      </div>

      <!-- Navigation Links -->
      <div class="space-y-2">
        <NuxtLink to="/settings/bank-accounts" class="card card-hover p-4 flex items-center gap-3">
          <Icon name="ph:bank" class="text-xl text-primary" />
          <div class="flex-1">
            <p class="font-medium">บัญชีธนาคาร</p>
            <p class="text-xs text-[var(--color-text-muted)]">จัดการบัญชีสำหรับถอนเงิน</p>
          </div>
          <Icon name="ph:caret-right" class="text-[var(--color-text-muted)]" />
        </NuxtLink>
        <NuxtLink to="/orders" class="card card-hover p-4 flex items-center gap-3">
          <Icon name="ph:shopping-bag" class="text-xl text-secondary" />
          <div class="flex-1">
            <p class="font-medium">ประวัติคำสั่งซื้อ</p>
            <p class="text-xs text-[var(--color-text-muted)]">ดูออเดอร์ทั้งหมดของคุณ</p>
          </div>
          <Icon name="ph:caret-right" class="text-[var(--color-text-muted)]" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
