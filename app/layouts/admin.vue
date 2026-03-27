<script setup lang="ts">
const mobileMenuOpen = ref(false)
const { isAdmin, fetchProfile, profile } = useAuth()
const user = useSupabaseUser()

// Auth gate — block rendering until admin check resolves
const authChecked = ref(false)
const authorized = ref(false)

onMounted(async () => {
  if (!user.value) {
    navigateTo('/login')
    return
  }
  if (!profile.value) {
    await fetchProfile()
  }
  authorized.value = isAdmin.value
  authChecked.value = true
  if (!authorized.value) {
    navigateTo('/')
  }
})
</script>

<template>
  <!-- Loading gate — never show admin content until verified -->
  <div v-if="!authChecked" class="min-h-screen flex items-center justify-center bg-surface-alt dark:bg-surface-dark">
    <div class="text-center space-y-3">
      <Icon name="ph:spinner" class="text-4xl text-primary animate-spin" />
      <p class="text-sm text-[var(--color-text-muted)]">กำลังตรวจสอบสิทธิ์...</p>
    </div>
  </div>

  <div v-else-if="authorized" class="min-h-screen flex bg-surface-alt dark:bg-surface-dark">
    <!-- Sidebar -->
    <aside class="hidden lg:flex lg:flex-col w-64 border-r border-border dark:border-border-dark bg-surface dark:bg-surface-dark-alt">
      <div class="p-4 border-b border-border dark:border-border-dark">
        <NuxtLink to="/admin" class="flex items-center gap-2">
          <Icon name="ph:crown-fill" class="text-primary text-2xl" />
          <span class="font-semibold text-lg">Admin Panel</span>
        </NuxtLink>
      </div>
      <nav class="flex-1 p-3 space-y-1">
        <AdminNavItem to="/admin" icon="ph:chart-bar-fill" label="Dashboard" />
        <AdminNavItem to="/admin/tickets" icon="ph:ticket-fill" label="จัดการลอตเตอรี่" />
        <AdminNavItem to="/admin/orders" icon="ph:shopping-bag-fill" label="ออเดอร์" />
        <AdminNavItem to="/admin/draws" icon="ph:calendar-fill" label="งวดลอตเตอรี่" />
        <AdminNavItem to="/admin/prize-claims" icon="ph:trophy-fill" label="รางวัล & ขึ้นเงิน" />
      </nav>
      <div class="p-4 border-t border-border dark:border-border-dark">
        <NuxtLink to="/" class="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <Icon name="ph:arrow-left" />
          กลับหน้าหลัก
        </NuxtLink>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-h-screen">
      <!-- Mobile Top Bar -->
      <header class="lg:hidden flex items-center justify-between p-4 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark-alt">
        <NuxtLink to="/admin" class="flex items-center gap-2">
          <Icon name="ph:crown-fill" class="text-primary text-xl" />
          <span class="font-semibold">Admin</span>
        </NuxtLink>
        <button class="btn-ghost p-2" @click="mobileMenuOpen = !mobileMenuOpen">
          <Icon name="ph:list" class="text-xl" />
        </button>
      </header>

      <!-- Mobile Menu Overlay -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="mobileMenuOpen" class="fixed inset-0 z-50 lg:hidden">
            <div class="absolute inset-0 bg-black/50" @click="mobileMenuOpen = false" />
            <nav class="absolute left-0 top-0 bottom-0 w-64 bg-surface dark:bg-surface-dark-alt p-4 space-y-1 overflow-y-auto">
              <div class="flex items-center justify-between mb-4">
                <span class="font-semibold text-lg">เมนู</span>
                <button @click="mobileMenuOpen = false">
                  <Icon name="ph:x" class="text-xl" />
                </button>
              </div>
              <AdminNavItem to="/admin" icon="ph:chart-bar-fill" label="Dashboard" @click="mobileMenuOpen = false" />
              <AdminNavItem to="/admin/tickets" icon="ph:ticket-fill" label="จัดการลอตเตอรี่" @click="mobileMenuOpen = false" />
              <AdminNavItem to="/admin/orders" icon="ph:shopping-bag-fill" label="ออเดอร์" @click="mobileMenuOpen = false" />
              <AdminNavItem to="/admin/draws" icon="ph:calendar-fill" label="งวดลอตเตอรี่" @click="mobileMenuOpen = false" />
              <AdminNavItem to="/admin/prize-claims" icon="ph:trophy-fill" label="รางวัล & ขึ้นเงิน" @click="mobileMenuOpen = false" />
            </nav>
          </div>
        </Transition>
      </Teleport>

      <main class="flex-1 p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
