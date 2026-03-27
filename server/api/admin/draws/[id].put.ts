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

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุ draw ID' })
  }

  const body = await readBody(event)
  const { status, draw_date } = body

  const updateData: Record<string, any> = {}

  if (status) {
    const validStatuses = ['upcoming', 'selling', 'closed', 'resulted']
    if (!validStatuses.includes(status)) {
      throw createError({ statusCode: 400, message: 'สถานะไม่ถูกต้อง' })
    }
    updateData.status = status
  }

  if (draw_date) {
    const dateObj = new Date(draw_date)
    if (isNaN(dateObj.getTime())) {
      throw createError({ statusCode: 400, message: 'รูปแบบวันที่ไม่ถูกต้อง' })
    }
    updateData.draw_date = draw_date
  }

  if (Object.keys(updateData).length === 0) {
    throw createError({ statusCode: 400, message: 'ไม่มีข้อมูลที่จะอัปเดต' })
  }

  const { data: draw, error } = await supabase
    .from('lottery_draws')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: 'อัปเดตไม่สำเร็จ' })
  }

  return { status: 'success', data: draw }
})
