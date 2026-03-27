// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@nuxtjs/google-fonts',
    '@nuxt/icon',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
  ],

  // Tailwind CSS
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
  },

  // Color Mode (Dark/Light)
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },

  // Google Fonts
  googleFonts: {
    families: {
      'IBM+Plex+Sans+Thai': [300, 400, 500, 600, 700],
      'IBM+Plex+Mono': [400, 500, 600, 700],
    },
    display: 'swap',
    preload: true,
  },

  // Supabase
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/safe(/*)?', '/cart(/*)?', '/checkout(/*)?', '/wallet(/*)?', '/orders(/*)?', '/settings(/*)?'],
      exclude: ['/', '/tickets(/*)?', '/results(/*)?'],
      cookieRedirect: false,
    },
  },

  // Runtime Config
  runtimeConfig: {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    slipokApiKey: process.env.SLIPOK_API_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    public: {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_KEY || '',
      appName: 'ลอตโต้ออนไลน์',
      platformFeePercent: 5,
      cartLockDurationSeconds: 900,
    },
  },

  // App
  app: {
    head: {
      title: 'ลอตโต้ออนไลน์ — ซื้อสลากกินแบ่งรัฐบาลออนไลน์',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'ซื้อสลากกินแบ่งรัฐบาลออนไลน์ ปลอดภัย ตรวจผลอัตโนมัติ ขึ้นเงินรางวัลได้ทันที' },
        { name: 'theme-color', content: '#1E3A5F' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  // TypeScript
  typescript: {
    strict: true,
  },
})
