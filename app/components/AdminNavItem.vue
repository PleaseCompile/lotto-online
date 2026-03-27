<script setup lang="ts">
defineProps<{
  to: string
  icon: string
  label: string
}>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-surface-alt dark:hover:bg-surface-dark transition-colors"
    active-class="!text-primary !bg-primary/10"
  >
    <Icon :name="icon" class="text-lg" />
    {{ label }}
  </NuxtLink>
</template>
