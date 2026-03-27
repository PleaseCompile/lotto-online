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
    throw createError({ statusCode: 400, message: 'กรุณาระบุ ticket ID' })
  }

  const body = await readBody(event)
  const { price, status } = body

  const updateData: Record<string, any> = {}

  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      throw createError({ statusCode: 400, message: 'ราคาไม่ถูกต้อง' })
    }
    updateData.price = price
  }

  if (status !== undefined) {
    const validStatuses = ['available', 'reserved', 'sold', 'cancelled']
    if (!validStatuses.includes(status)) {
      throw createError({ statusCode: 400, message: 'สถานะไม่ถูกต้อง' })
    }
    updateData.status = status
  }

  if (Object.keys(updateData).length === 0) {
    throw createError({ statusCode: 400, message: 'ไม่มีข้อมูลที่จะอัปเดต' })
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: 'อัปเดตไม่สำเร็จ' })
  }

  return { status: 'success', data: ticket }
})
