<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

const BANKS = [
  'กสิกรไทย', 'กรุงเทพ', 'กรุงไทย', 'ไทยพาณิชย์', 'ทหารไทยธนชาต',
  'กรุงศรีอยุธยา', 'ออมสิน', 'ธ.ก.ส.', 'เกียรตินาคินภัทร', 'ซีไอเอ็มบี',
  'ทิสโก้', 'ยูโอบี', 'แลนด์ แอนด์ เฮ้าส์', 'สแตนดาร์ดชาร์เตอร์ด',
]

interface BankAccount {
  id: string
  bank_name: string
  account_number: string
  account_name: string
  is_default: boolean
}

const accounts = ref<BankAccount[]>([])
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const deleteConfirm = ref<string | null>(null)

const form = reactive({
  bank_name: '',
  account_number: '',
  account_name: '',
  is_default: false,
})

async function fetchAccounts() {
  loading.value = true
  try {
    const res = await $fetch<{ data: BankAccount[] }>('/api/bank-accounts')
    accounts.value = res.data
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function addAccount() {
  saving.value = true
  try {
    await $fetch('/api/bank-accounts', {
      method: 'POST',
      body: form,
    })
    showForm.value = false
    form.bank_name = ''
    form.account_number = ''
    form.account_name = ''
    form.is_default = false
    await fetchAccounts()
  } catch (err: any) {
    alert(err.data?.message || 'เกิดข้อผิดพลาด')
  } finally {
    saving.value = false
  }
}

async function deleteAccount(id: string) {
  try {
    await $fetch(`/api/bank-accounts/${id}`, { method: 'DELETE' })
    deleteConfirm.value = null
    await fetchAccounts()
  } catch (err: any) {
    alert(err.data?.message || 'เกิดข้อผิดพลาด')
  }
}

await fetchAccounts()

useSeoMeta({ title: 'บัญชีธนาคาร — ตั้งค่า' })
</script>

<template>
  <div class="page-container max-w-2xl">
    <h1 class="text-2xl font-bold mb-6">
      <Icon name="ph:bank" class="text-primary" />
      บัญชีธนาคาร
    </h1>

    <!-- Account List -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="card p-4">
        <SkeletonLoader height="1.5rem" class="mb-2" />
        <SkeletonLoader height="1rem" width="60%" />
      </div>
    </div>

    <div v-else>
      <div
        v-for="acc in accounts"
        :key="acc.id"
        class="card p-4 mb-3 flex items-center gap-4"
      >
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon name="ph:bank" class="text-primary text-xl" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium">
            {{ acc.bank_name }}
            <span v-if="acc.is_default" class="badge badge-success text-xs ml-2">ค่าเริ่มต้น</span>
          </p>
          <p class="text-sm text-[var(--color-text-muted)]">
            {{ acc.account_number }} — {{ acc.account_name }}
          </p>
        </div>
        <div>
          <button
            v-if="deleteConfirm !== acc.id"
            class="text-danger text-sm hover:underline"
            @click="deleteConfirm = acc.id"
          >
            ลบ
          </button>
          <div v-else class="flex gap-2 items-center">
            <button class="text-danger text-sm font-semibold" @click="deleteAccount(acc.id)">
              ยืนยันลบ
            </button>
            <button class="text-[var(--color-text-muted)] text-sm" @click="deleteConfirm = null">
              ยกเลิก
            </button>
          </div>
        </div>
      </div>

      <div v-if="!accounts.length" class="text-center py-12">
        <Icon name="ph:bank" class="text-5xl text-[var(--color-text-muted)] mb-3" />
        <p class="text-[var(--color-text-muted)]">ยังไม่มีบัญชีธนาคาร</p>
      </div>
    </div>

    <!-- Add Button -->
    <button
      v-if="!showForm && accounts.length < 3"
      class="btn-primary mt-4"
      @click="showForm = true"
    >
      <Icon name="ph:plus" />
      เพิ่มบัญชีธนาคาร
    </button>

    <!-- Add Form -->
    <div v-if="showForm" class="card p-6 mt-4">
      <h2 class="font-semibold mb-4">เพิ่มบัญชีธนาคาร</h2>
      <form class="space-y-4" @submit.prevent="addAccount">
        <div>
          <label class="block text-sm font-medium mb-1">ธนาคาร</label>
          <select v-model="form.bank_name" class="input w-full" required>
            <option value="" disabled>เลือกธนาคาร</option>
            <option v-for="bank in BANKS" :key="bank" :value="bank">{{ bank }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">เลขบัญชี</label>
          <input
            v-model="form.account_number"
            type="text"
            class="input w-full font-mono"
            placeholder="0001234567"
            required
            pattern="[\d\-]{10,17}"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">ชื่อบัญชี</label>
          <input
            v-model="form.account_name"
            type="text"
            class="input w-full"
            placeholder="ชื่อ-นามสกุล"
            required
          />
        </div>
        <label class="flex items-center gap-2">
          <input v-model="form.is_default" type="checkbox" />
          <span class="text-sm">ตั้งเป็นบัญชีค่าเริ่มต้น</span>
        </label>
        <div class="flex gap-3">
          <UiButton type="submit" variant="primary" :loading="saving">
            บันทึก
          </UiButton>
          <UiButton variant="ghost" @click="showForm = false">
            ยกเลิก
          </UiButton>
        </div>
      </form>
    </div>
  </div>
</template>
