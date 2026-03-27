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

  const body = await readBody(event)
  const { draw_date, status } = body

  if (!draw_date) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุวันที่ออกรางวัล' })
  }

  // Validate date format
  const dateObj = new Date(draw_date)
  if (isNaN(dateObj.getTime())) {
    throw createError({ statusCode: 400, message: 'รูปแบบวันที่ไม่ถูกต้อง' })
  }

  // Check if draw already exists for this date
  const { data: existing } = await supabase
    .from('lottery_draws')
    .select('id')
    .eq('draw_date', draw_date)
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, message: 'มีงวดวันที่นี้อยู่แล้ว' })
  }

  const { data: draw, error } = await supabase
    .from('lottery_draws')
    .insert({
      draw_date,
      status: status || 'upcoming',
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: 'สร้างงวดไม่สำเร็จ' })
  }

  return { status: 'success', data: draw }
})
