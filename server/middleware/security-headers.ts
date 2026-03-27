export default defineEventHandler((event) => {
  const headers = event.node.res

  // HSTS — enforce HTTPS for 1 year + subdomains
  headers.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  // Prevent MIME-type sniffing
  headers.setHeader('X-Content-Type-Options', 'nosniff')

  // Clickjacking protection
  headers.setHeader('X-Frame-Options', 'DENY')

  // XSS filter (legacy browsers)
  headers.setHeader('X-XSS-Protection', '1; mode=block')

  // Control referrer information
  headers.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Restrict browser features
  headers.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  // Content Security Policy
  headers.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '))

  // Prevent caching of sensitive pages
  if (event.path?.startsWith('/admin') || event.path?.startsWith('/api/')) {
    headers.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    headers.setHeader('Pragma', 'no-cache')
  }
})
