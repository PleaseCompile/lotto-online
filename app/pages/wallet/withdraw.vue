<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const accounts = ref<any[]>([])
const loading = ref(true)
const amount = ref<number | null>(null)
const selectedAccount = ref('')
const submitting = ref(false)
const success = ref(false)

async function fetchAccounts() {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/bank-accounts')
    accounts.value = res.data
    if (res.data.length > 0) {
      const def = res.data.find((a: any) => a.is_default)
      selectedAccount.value = def?.id || res.data[0].id
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

const { data: walletData } = await useAsyncData('wallet-withdraw', () =>
  $fetch<any>('/api/wallet')
)

const balance = computed(() => walletData.value?.data?.balance || 0)
const formatPrice = (satang: number) => new Intl.NumberFormat('th-TH').format(satang / 100)

async function submitWithdraw() {
  if (!amount.value || !selectedAccount.value) return
  submitting.value = true
  try {
    await $fetch('/api/wallet/withdraw', {
      method: 'POST',
      body: {
        amount: amount.value,
        bank_account_id: selectedAccount.value,
      },
    })
    success.value = true
  } catch (err: any) {
    alert(err.data?.message || 'ถอนเงินไม่สำเร็จ')
  } finally {
    submitting.value = false
  }
}

await fetchAccounts()

useSeoMeta({ title: 'ถอนเงิน' })
</script>

<template>
  <div class="page-container max-w-lg">
    <NuxtLink to="/wallet" class="text-sm text-[var(--color-text-muted)] hover:text-primary mb-4 inline-flex items-center gap-1">
      <Icon name="ph:arrow-left" /> กลับไปกระเป๋าเงิน
    </NuxtLink>

    <h1 class="text-2xl font-bold mb-6">ถอนเงิน</h1>

    <!-- Success -->
    <div v-if="success" class="card p-8 text-center">
      <Icon name="ph:check-circle-fill" class="text-5xl text-success mb-4" />
      <p class="text-lg font-semibold mb-2">คำขอถอนเงินถูกส่งแล้ว</p>
      <p class="text-[var(--color-text-muted)] mb-6">รอแอดมินดำเนินการภายใน 24 ชั่วโมง</p>
      <NuxtLink to="/wallet" class="btn-primary">กลับหน้ากระเป๋าเงิน</NuxtLink>
    </div>

    <div v-else class="card p-6 space-y-5">
      <!-- Balance -->
      <div class="bg-surface-alt dark:bg-surface-dark-alt rounded-lg p-4">
        <p class="text-sm text-[var(--color-text-muted)]">ยอดเงินคงเหลือ</p>
        <p class="text-2xl font-bold">฿{{ formatPrice(balance) }}</p>
      </div>

      <!-- Amount -->
      <div>
        <label class="block text-sm font-medium mb-1">จำนวนเงินที่ต้องการถอน (บาท)</label>
        <input
          v-model.number="amount"
          type="number"
          class="input w-full text-lg font-mono"
          placeholder="0.00"
          min="1"
          :max="balance / 100"
          step="1"
        />
      </div>

      <!-- Bank Account Select -->
      <div>
        <label class="block text-sm font-medium mb-1">บัญชีปลายทาง</label>
        <div v-if="loading" class="py-3">
          <SkeletonLoader height="2.5rem" />
        </div>
        <div v-else-if="!accounts.length" class="py-3">
          <p class="text-[var(--color-text-muted)] text-sm mb-2">ยังไม่มีบัญชีธนาคาร</p>
          <NuxtLink to="/settings/bank-accounts" class="text-primary text-sm hover:underline">
            เพิ่มบัญชีธนาคาร
          </NuxtLink>
        </div>
        <select v-else v-model="selectedAccount" class="input w-full">
          <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
            {{ acc.bank_name }} — {{ acc.account_number }} ({{ acc.account_name }})
          </option>
        </select>
      </div>

      <!-- Submit -->
      <UiButton
        variant="primary"
        class="w-full"
        :loading="submitting"
        :disabled="!amount || !selectedAccount || amount <= 0 || amount > balance / 100"
        @click="submitWithdraw"
      >
        ถอนเงิน ฿{{ amount ? new Intl.NumberFormat('th-TH').format(amount) : '0' }}
      </UiButton>
    </div>
  </div>
</template>
