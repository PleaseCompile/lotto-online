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

  // Check ticket status — can only delete if not sold
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!ticket) {
    throw createError({ statusCode: 404, message: 'ไม่พบลอตเตอรี่นี้' })
  }

  if (ticket.status === 'sold') {
    throw createError({ statusCode: 400, message: 'ไม่สามารถลบลอตเตอรี่ที่ขายแล้วได้' })
  }

  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, message: 'ลบไม่สำเร็จ' })
  }

  return { status: 'success' }
})
