import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const cookies = parseCookies(event)
  const cookieNames = Object.keys(cookies).filter(k => k.startsWith('sb-'))
  console.log('[/api/me] Supabase cookies present:', cookieNames)

  let user
  try {
    user = await serverSupabaseUser(event)
  } catch (e: any) {
    console.log('[/api/me] serverSupabaseUser threw:', e?.message)
  }

  if (!user) {
    console.log('[/api/me] No user found, returning 401')
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  console.log('[/api/me] User found:', user.id)
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, message: 'ไม่พบข้อมูลผู้ใช้' })
  }

  return data
})
