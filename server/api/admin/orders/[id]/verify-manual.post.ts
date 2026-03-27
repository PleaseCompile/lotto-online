import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../../../utils/supabase'

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
    throw createError({ statusCode: 400, message: 'กรุณาระบุ order ID' })
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, total_amount, user_id, order_number')
    .eq('id', id)
    .single()

  if (!order) {
    throw createError({ statusCode: 404, message: 'ไม่พบออเดอร์' })
  }

  if (order.status !== 'pending_payment') {
    throw createError({ statusCode: 400, message: `ออเดอร์สถานะ ${order.status} ไม่สามารถยืนยันได้` })
  }

  // Update order to paid
  await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', id)

  // Update any pending payments to verified
  await supabase
    .from('payments')
    .update({ status: 'verified', verified_at: new Date().toISOString() })
    .eq('order_id', id)
    .eq('status', 'pending_verification')

  // Update tickets to sold
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('ticket_id')
    .eq('order_id', id)

  if (orderItems?.length) {
    await supabase
      .from('tickets')
      .update({ status: 'sold' })
      .in('id', orderItems.map((i) => i.ticket_id))
  }

  // Create notification
  await supabase.from('notifications').insert({
    user_id: order.user_id,
    type: 'payment_verified',
    title: 'การชำระเงินสำเร็จ',
    message: `ออเดอร์ ${order.order_number} ได้รับการยืนยันการชำระเงินแล้ว`,
    metadata: { order_id: id },
  })

  return { status: 'success' }
})
