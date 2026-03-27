import { acquireTicketLock, releaseTicketLock } from '../../services/cartLock.service'
import { addCartExpiryJob } from '../../services/queue.service'
import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const body = await readBody(event)
  const { ticket_id } = body

  if (!ticket_id || typeof ticket_id !== 'string') {
    throw createError({ statusCode: 400, message: 'ticket_id is required' })
  }

  const supabase = getServiceClient()

  // Check ticket exists and is available
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id, ticket_number, price, status, draw_id, set_number')
    .eq('id', ticket_id)
    .single()

  if (ticketError || !ticket) {
    throw createError({ statusCode: 404, message: 'ไม่พบลอตเตอรี่ใบนี้' })
  }

  if (ticket.status === 'sold') {
    throw createError({
      statusCode: 410,
      data: { code: 'TICKET_SOLD' },
      message: 'ลอตเตอรี่ใบนี้ถูกซื้อไปแล้ว',
    })
  }

  if (ticket.status === 'locked') {
    throw createError({
      statusCode: 409,
      data: { code: 'TICKET_LOCKED' },
      message: 'ลอตเตอรี่ใบนี้ถูกล็อกอยู่โดยผู้ใช้อื่น',
    })
  }

  // Check cart limit
  const { count } = await supabase
    .from('cart_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'active')

  if ((count || 0) >= 10) {
    throw createError({
      statusCode: 400,
      data: { code: 'CART_FULL' },
      message: 'ตะกร้าเต็ม (สูงสุด 10 ใบ)',
    })
  }

  // Atomic Redis Lock
  const lockResult = await acquireTicketLock(ticket_id, user.id)

  if (!lockResult.success) {
    throw createError({
      statusCode: 409,
      data: { code: 'TICKET_LOCKED' },
      message: 'ลอตเตอรี่ใบนี้ถูกล็อกอยู่โดยผู้ใช้อื่น กรุณาลองใหม่',
    })
  }

  try {
    // Update ticket status in DB
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'locked',
        locked_by: user.id,
        locked_until: lockResult.expiresAt!.toISOString(),
      })
      .eq('id', ticket_id)
      .eq('status', 'available')

    if (updateError) {
      await releaseTicketLock(ticket_id, user.id)
      throw createError({ statusCode: 500, message: 'ไม่สามารถล็อกได้ กรุณาลองใหม่' })
    }

    // Insert cart item
    const { data: cartItem, error: cartError } = await supabase
      .from('cart_items')
      .insert({
        user_id: user.id,
        ticket_id,
        locked_at: new Date().toISOString(),
        expires_at: lockResult.expiresAt!.toISOString(),
        status: 'active',
      })
      .select()
      .single()

    if (cartError) {
      await releaseTicketLock(ticket_id, user.id)
      await supabase
        .from('tickets')
        .update({ status: 'available', locked_by: null, locked_until: null })
        .eq('id', ticket_id)

      throw createError({ statusCode: 500, message: 'ไม่สามารถเพิ่มลงตะกร้าได้' })
    }

    // Queue delayed job for auto-expiry
    await addCartExpiryJob(
      { cartItemId: cartItem.id, ticketId: ticket_id, userId: user.id },
      900_000
    )

    return {
      status: 'success',
      data: {
        cart_item_id: cartItem.id,
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        price: ticket.price,
        locked_at: cartItem.locked_at,
        expires_at: cartItem.expires_at,
        countdown_seconds: lockResult.remainingSeconds,
      },
    }
  } catch (error) {
    await releaseTicketLock(ticket_id, user.id)
    throw error
  }
})
