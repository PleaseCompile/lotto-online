<script setup lang="ts">
import type { RaffiyDrawResponse } from '~/types/api'

const { data: latestResult, pending } = await useAsyncData('latest-result', async () => {
  const response = await $fetch<RaffiyDrawResponse>('https://lotto.api.rayriffy.com/latest')
  return response.response
})

useSeoMeta({
  title: 'ผลรางวัลสลากกินแบ่งรัฐบาล — ลอตโต้ออนไลน์',
})
</script>

<template>
  <div class="page-container">
    <h1 class="text-2xl font-bold mb-6">ผลรางวัลสลากกินแบ่งรัฐบาล</h1>

    <!-- Loading -->
    <div v-if="pending" class="space-y-4">
      <div class="card p-6">
        <SkeletonLoader height="2rem" width="50%" class="mb-4 mx-auto" />
        <SkeletonLoader height="3rem" class="mb-2" />
        <SkeletonLoader height="1.5rem" width="40%" class="mx-auto" />
      </div>
    </div>

    <template v-else-if="latestResult">
      <!-- Draw Date -->
      <div class="text-center mb-8">
        <p class="text-[var(--color-text-muted)]">งวดวันที่</p>
        <p class="text-xl font-bold">{{ latestResult.date }}</p>
      </div>

      <!-- Prizes -->
      <div class="space-y-4">
        <div
          v-for="prize in latestResult.prizes"
          :key="prize.id"
          class="card overflow-hidden"
        >
          <div class="bg-gradient-to-r from-secondary to-secondary-light px-4 py-2">
            <h3 class="text-white font-medium text-sm">{{ prize.name }}</h3>
            <p class="text-primary text-xs">
              {{ Number(prize.reward).toLocaleString('th-TH') }} บาท
            </p>
          </div>
          <div class="p-4">
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(num, i) in prize.number"
                :key="i"
                class="inline-flex items-center px-3 py-1.5 bg-surface-alt dark:bg-surface-dark-alt rounded-md font-mono text-lg font-bold tracking-wider"
              >
                {{ num }}
              </span>
            </div>
          </div>
        </div>

        <!-- Running Numbers -->
        <div
          v-for="rn in latestResult.runningNumbers"
          :key="rn.id"
          class="card overflow-hidden"
        >
          <div class="bg-gradient-to-r from-primary-dark to-primary px-4 py-2">
            <h3 class="text-secondary-dark font-medium text-sm">{{ rn.name }}</h3>
            <p class="text-secondary-dark/70 text-xs">
              {{ Number(rn.reward).toLocaleString('th-TH') }} บาท
            </p>
          </div>
          <div class="p-4">
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(num, i) in rn.number"
                :key="i"
                class="inline-flex items-center px-3 py-1.5 bg-surface-alt dark:bg-surface-dark-alt rounded-md font-mono text-lg font-bold tracking-wider"
              >
                {{ num }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Error -->
    <div v-else class="text-center py-20">
      <Icon name="ph:warning-circle" class="text-5xl text-[var(--color-text-muted)] mb-3" />
      <p class="text-[var(--color-text-muted)]">ไม่สามารถโหลดผลรางวัลได้</p>
    </div>
  </div>
</template>
