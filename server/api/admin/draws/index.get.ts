import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const supabase = getServiceClient()

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'เฉพาะแอดมินเท่านั้น' })
  }

  const { data: draws, error } = await supabase
    .from('lottery_draws')
    .select('*')
    .order('draw_date', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: 'ดึงข้อมูลไม่สำเร็จ' })
  }

  return { data: draws || [] }
})
