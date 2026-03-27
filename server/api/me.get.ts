import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getServiceClient()
  let userId: string | null = null

  // Try 1: Use @nuxtjs/supabase's serverSupabaseUser
  try {
    const user = await serverSupabaseUser(event)
    if (user) {
      userId = user.id
    }
  } catch {
    // Silently continue to fallback
  }

  // Try 2: Parse JWT from cookies manually
  if (!userId) {
    const cookies = parseCookies(event)
    // @nuxtjs/supabase v2 uses chunked cookies: sb-<ref>-auth-token.0, .1, etc.
    const cookieBase = 'sb-pilsoaowfqdbnxmgfuck-auth-token'
    let tokenStr = cookies[cookieBase] || ''

    // Reassemble chunked cookies
    if (!tokenStr) {
      const chunks: string[] = []
      for (let i = 0; ; i++) {
        const chunk = cookies[`${cookieBase}.${i}`]
        if (!chunk) break
        chunks.push(chunk)
      }
      tokenStr = chunks.join('')
    }

    if (tokenStr) {
      try {
        // Try parsing as JSON (could be direct JSON or base64-encoded)
        let parsed: any
        try {
          parsed = JSON.parse(tokenStr)
        } catch {
          parsed = JSON.parse(Buffer.from(tokenStr, 'base64').toString())
        }

        const accessToken = typeof parsed === 'string' ? parsed :
          Array.isArray(parsed) ? parsed[0] :
          parsed.access_token || parsed.token

        if (accessToken) {
          const { data: { user } } = await supabase.auth.getUser(accessToken)
          if (user) userId = user.id
        }
      } catch {
        // Continue to next fallback
      }
    }
  }

  // Try 3: Authorization Bearer header
  if (!userId) {
    const authHeader = getHeader(event, 'authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const { data: { user } } = await supabase.auth.getUser(token)
        if (user) userId = user.id
      } catch {
        // No valid token
      }
    }
  }

  if (!userId) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลผู้ใช้' })
  }

  return data
})
