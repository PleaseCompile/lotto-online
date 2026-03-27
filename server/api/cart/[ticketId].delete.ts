import { releaseTicketLock } from '../../services/cartLock.service'
import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const ticketId = getRouterParam(event, 'ticketId')
  if (!ticketId) {
    throw createError({ statusCode: 400, message: 'ticket_id is required' })
  }

  const supabase = getServiceClient()

  // Find cart item
  const { data: cartItem } = await supabase
    .from('cart_items')
    .select('id, ticket_id')
    .eq('user_id', user.id)
    .eq('ticket_id', ticketId)
    .eq('status', 'active')
    .single()

  if (!cartItem) {
    throw createError({ statusCode: 404, message: 'ไม่พบรายการในตะกร้า' })
  }

  // Release Redis lock
  await releaseTicketLock(ticketId, user.id)

  // Reset ticket status
  await supabase
    .from('tickets')
    .update({
      status: 'available',
      locked_by: null,
      locked_until: null,
    })
    .eq('id', ticketId)
    .eq('locked_by', user.id)

  // Update cart item
  await supabase
    .from('cart_items')
    .update({ status: 'expired' })
    .eq('id', cartItem.id)

  return { status: 'success', message: 'ลบออกจากตะกร้าเรียบร้อย' }
})
