<script setup lang="ts">
const config = useRuntimeConfig()
const currentYear = new Date().getFullYear() + 543 // พ.ศ.
</script>

<template>
  <footer class="border-t border-border dark:border-border-dark bg-surface-alt dark:bg-surface-dark-alt">
    <div class="page-container">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-8">
        <!-- Brand -->
        <div>
          <NuxtLink to="/" class="flex items-center gap-2 mb-3">
            <Icon name="ph:clover-fill" class="text-primary text-2xl" />
            <span class="font-bold text-lg">{{ config.public.appName }}</span>
          </NuxtLink>
          <p class="text-sm text-[var(--color-text-muted)] leading-relaxed">
            ซื้อสลากกินแบ่งรัฐบาลออนไลน์ ปลอดภัย ตรวจรางวัลอัตโนมัติ ขึ้นเงินรางวัลได้ทันที
          </p>
        </div>

        <!-- Quick Links -->
        <div>
          <h4 class="font-semibold text-sm mb-3">ลิงก์ด่วน</h4>
          <ul class="space-y-2">
            <li>
              <NuxtLink to="/tickets" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                ซื้อลอตเตอรี่
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/results" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                ผลรางวัล
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/safe" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                ตู้เซฟของฉัน
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Help -->
        <div>
          <h4 class="font-semibold text-sm mb-3">ช่วยเหลือ</h4>
          <ul class="space-y-2">
            <li>
              <NuxtLink to="/help" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                วิธีการสั่งซื้อ
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/faq" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                คำถามที่พบบ่อย
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/contact" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                ติดต่อเรา
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Legal -->
        <div>
          <h4 class="font-semibold text-sm mb-3">นโยบาย</h4>
          <ul class="space-y-2">
            <li>
              <NuxtLink to="/terms" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                ข้อกำหนดการใช้งาน
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/privacy" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                นโยบายความเป็นส่วนตัว
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/refund" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                นโยบายการคืนเงิน
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom -->
      <div class="border-t border-border dark:border-border-dark py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p class="text-xs text-[var(--color-text-muted)]">
          &copy; {{ currentYear }} {{ config.public.appName }} — สงวนลิขสิทธิ์ทุกประการ
        </p>
        <p class="text-xs text-[var(--color-text-muted)]">
          ไม่มีส่วนเกี่ยวข้องกับสำนักงานสลากกินแบ่งรัฐบาล
        </p>
      </div>
    </div>
  </footer>
</template>
