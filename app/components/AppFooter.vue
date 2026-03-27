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
          <h4 class="font-semibold text-sm mb-3">บัญชีของฉัน</h4>
          <ul class="space-y-2">
            <li>
              <NuxtLink to="/orders" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                คำสั่งซื้อ
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/wallet" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                กระเป๋าเงิน
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/settings" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                ตั้งค่าบัญชี
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Info -->
        <div>
          <h4 class="font-semibold text-sm mb-3">ข้อมูล</h4>
          <ul class="space-y-2">
            <li>
              <NuxtLink to="/results" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                ผลรางวัลล่าสุด
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/login" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                เข้าสู่ระบบ
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/register" class="text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors">
                สมัครสมาชิก
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
