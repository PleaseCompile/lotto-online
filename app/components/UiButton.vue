<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
}>()

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

const variantClasses = {
  primary: 'bg-primary text-secondary-dark hover:bg-primary-dark shadow-sm hover:shadow-glow',
  secondary: 'bg-secondary text-white hover:bg-secondary-light',
  outline: 'border border-border dark:border-border-dark bg-transparent hover:bg-surface-alt dark:hover:bg-surface-dark-alt',
  danger: 'bg-danger text-white hover:bg-danger-dark',
  ghost: 'bg-transparent hover:bg-surface-alt dark:hover:bg-surface-dark-alt',
}
</script>

<template>
  <button
    class="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
    :class="[sizeClasses[size || 'md'], variantClasses[variant || 'primary']]"
    :disabled="disabled || loading"
  >
    <Icon v-if="loading" name="ph:spinner" class="animate-spin" />
    <slot />
  </button>
</template>
