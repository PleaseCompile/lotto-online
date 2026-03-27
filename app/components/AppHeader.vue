<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const colorMode = useColorMode()
const mobileMenuOpen = ref(false)
const config = useRuntimeConfig()

const navLinks = [
  { to: '/tickets', label: 'ซื้อลอตเตอรี่', icon: 'ph:ticket' },
  { to: '/results', label: 'ผลรางวัล', icon: 'ph:trophy' },
]

const userLinks = [
  { to: '/safe', label: 'ตู้เซฟ', icon: 'ph:vault' },
  { to: '/orders', label: 'คำสั่งซื้อ', icon: 'ph:shopping-bag' },
  { to: '/wallet', label: 'กระเป๋าเงิน', icon: 'ph:wallet' },
]

const cartCount = ref(0)

// Fetch real cart count
const fetchCartCount = async () => {
  if (!user.value) {
    cartCount.value = 0
    return
  }
  const { count } = await supabase
    .from('cart_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.value.id)
    .eq('status', 'active')
  cartCount.value = count || 0
}

watch(user, () => fetchCartCount(), { immediate: true })
</script>

<template>
  <header class="sticky top-0 z-40 bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-lg border-b border-border dark:border-border-dark">
    <div class="page-container !py-0">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 shrink-0">
          <Icon name="ph:clover-fill" class="text-primary text-2xl" />
          <span class="font-bold text-lg hidden sm:inline">{{ config.public.appName }}</span>
        </NuxtLink>

        <!-- Desktop Nav -->
        <nav class="hidden md:flex items-center gap-1">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-surface-alt dark:hover:bg-surface-dark-alt transition-colors"
            active-class="!text-primary !bg-primary/10"
          >
            <Icon :name="link.icon" />
            {{ link.label }}
          </NuxtLink>
        </nav>

        <!-- Right Actions -->
        <div class="flex items-center gap-2">
          <!-- Theme Toggle -->
          <button
            class="p-2 rounded-md hover:bg-surface-alt dark:hover:bg-surface-dark-alt transition-colors"
            :title="colorMode.value === 'dark' ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'"
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
          >
            <Icon
              :name="colorMode.value === 'dark' ? 'ph:sun-fill' : 'ph:moon-fill'"
              class="text-lg"
            />
          </button>

          <!-- Cart -->
          <NuxtLink
            v-if="user"
            to="/cart"
            class="relative p-2 rounded-md hover:bg-surface-alt dark:hover:bg-surface-dark-alt transition-colors"
          >
            <Icon name="ph:shopping-cart" class="text-lg" />
            <span
              v-if="cartCount > 0"
              class="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center bg-danger text-white text-[10px] font-bold rounded-full"
            >
              {{ cartCount }}
            </span>
          </NuxtLink>

          <!-- User Menu (Logged In) -->
          <div v-if="user" class="relative group">
            <button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-surface-alt dark:hover:bg-surface-dark-alt transition-colors">
              <Icon name="ph:user-circle-fill" class="text-xl text-primary" />
              <Icon name="ph:caret-down" class="text-xs" />
            </button>
            <div class="absolute right-0 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div class="w-48 bg-surface dark:bg-surface-dark-alt border border-border dark:border-border-dark rounded-lg shadow-lg py-1">
                <NuxtLink
                  v-for="link in userLinks"
                  :key="link.to"
                  :to="link.to"
                  class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-alt dark:hover:bg-surface-dark transition-colors"
                >
                  <Icon :name="link.icon" />
                  {{ link.label }}
                </NuxtLink>
                <div class="border-t border-border dark:border-border-dark my-1" />
                <NuxtLink
                  to="/settings"
                  class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-alt dark:hover:bg-surface-dark transition-colors"
                >
                  <Icon name="ph:gear" />
                  ตั้งค่า
                </NuxtLink>
                <button
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors"
                  @click="navigateTo('/logout')"
                >
                  <Icon name="ph:sign-out" />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </div>

          <!-- Login Button (Not Logged In) -->
          <NuxtLink v-else to="/login" class="btn-primary text-sm !px-4 !py-2">
            เข้าสู่ระบบ
          </NuxtLink>

          <!-- Mobile Menu Button -->
          <button
            class="md:hidden p-2 rounded-md hover:bg-surface-alt dark:hover:bg-surface-dark-alt transition-colors"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <Icon :name="mobileMenuOpen ? 'ph:x' : 'ph:list'" class="text-xl" />
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <Transition name="slide-down">
        <nav v-if="mobileMenuOpen" class="md:hidden pb-3 space-y-1">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-surface-alt dark:hover:bg-surface-dark-alt transition-colors"
            active-class="!text-primary !bg-primary/10"
            @click="mobileMenuOpen = false"
          >
            <Icon :name="link.icon" />
            {{ link.label }}
          </NuxtLink>
          <template v-if="user">
            <div class="border-t border-border dark:border-border-dark my-2" />
            <NuxtLink
              v-for="link in userLinks"
              :key="link.to"
              :to="link.to"
              class="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-surface-alt dark:hover:bg-surface-dark-alt transition-colors"
              active-class="!text-primary !bg-primary/10"
              @click="mobileMenuOpen = false"
            >
              <Icon :name="link.icon" />
              {{ link.label }}
            </NuxtLink>
          </template>
        </nav>
      </Transition>
    </div>
  </header>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
