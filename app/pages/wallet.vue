<script setup lang="ts">
import type { Wallet, WalletTransaction } from '~/types/database'

definePageMeta({
  middleware: ['auth'],
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const userId = useUserId()

const { data: wallet, pending: walletPending } = await useAsyncData('wallet', async () => {
  if (!user.value) return null
  const { data } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId.value)
    .single()
  return data as Wallet | null
})

const { data: transactions, pending: txPending } = await useAsyncData('wallet-tx', async () => {
  if (!user.value || !wallet.value) return []
  const { data } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('wallet_id', wallet.value.id)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data || []) as WalletTransaction[]
})

const formatPrice = (satang: number) => {
  return new Intl.NumberFormat('th-TH').format(satang / 100)
}

const txTypeLabel: Record<string, string> = {
  deposit: 'ฝากเงิน',
  withdrawal: 'ถอนเงิน',
  prize_payout: 'เงินรางวัล',
  purchase: 'ซื้อลอตเตอรี่',
  refund: 'คืนเงิน',
}

const txTypeIcon: Record<string, string> = {
  deposit: 'ph:arrow-down-left',
  withdrawal: 'ph:arrow-up-right',
  prize_payout: 'ph:trophy',
  purchase: 'ph:shopping-cart',
  refund: 'ph:arrow-counter-clockwise',
}

useSeoMeta({ title: 'กระเป๋าเงิน' })
</script>

<template>
  <div class="page-container">
    <h1 class="text-2xl font-bold mb-6">กระเป๋าเงิน</h1>

    <!-- Balance Card -->
    <div class="card bg-gradient-to-r from-secondary to-secondary-light p-6 text-white mb-6">
      <p class="text-white/70 text-sm">ยอดเงินคงเหลือ</p>
      <p v-if="walletPending" class="text-3xl font-bold mt-1">...</p>
      <p v-else class="text-3xl font-bold mt-1">
        {{ formatPrice(wallet?.balance || 0) }} บาท
      </p>
      <div class="flex gap-3 mt-4">
        <NuxtLink to="/wallet/withdraw" class="btn bg-white/20 hover:bg-white/30 text-white text-sm">
          <Icon name="ph:arrow-up-right" />
          ถอนเงิน
        </NuxtLink>
      </div>
    </div>

    <!-- Transactions -->
    <h2 class="section-title mb-4">ประวัติธุรกรรม</h2>

    <div v-if="txPending" class="space-y-2">
      <div v-for="i in 5" :key="i" class="card p-3">
        <SkeletonLoader height="1.5rem" />
      </div>
    </div>

    <div v-else-if="!transactions?.length" class="text-center py-12">
      <Icon name="ph:receipt" class="text-5xl text-[var(--color-text-muted)] mb-3" />
      <p class="text-[var(--color-text-muted)]">ยังไม่มีธุรกรรม</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="tx in transactions"
        :key="tx.id"
        class="card p-4 flex items-center gap-3"
      >
        <div
          class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          :class="tx.amount > 0 ? 'bg-success/10' : 'bg-danger/10'"
        >
          <Icon
            :name="txTypeIcon[tx.type] || 'ph:receipt'"
            class="text-lg"
            :class="tx.amount > 0 ? 'text-success' : 'text-danger'"
          />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ txTypeLabel[tx.type] }}</p>
          <p class="text-xs text-[var(--color-text-muted)]">
            {{ new Date(tx.created_at).toLocaleString('th-TH') }}
          </p>
        </div>
        <span
          class="font-mono font-semibold whitespace-nowrap"
          :class="tx.amount > 0 ? 'text-success' : 'text-danger'"
        >
          {{ tx.amount > 0 ? '+' : '' }}{{ formatPrice(tx.amount) }}
        </span>
      </div>
    </div>
  </div>
</template>
