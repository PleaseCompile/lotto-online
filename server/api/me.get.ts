import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

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
