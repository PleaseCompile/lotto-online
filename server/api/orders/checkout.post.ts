import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../utils/supabase'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const supabase = getServiceClient()

  // Get active cart items
  const { data: cartItems } = await supabase
    .from('cart_items')
    .select('*, tickets(id, ticket_number, price)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (!cartItems?.length) {
    throw createError({ statusCode: 400, message: 'ตะกร้าว่างเปล่า' })
  }

  // Calculate total
  const totalAmount = cartItems.reduce((sum: number, item: any) => sum + (item.tickets?.price || 0), 0)
  const itemCount = cartItems.length

  // Generate order number: ORD-YYYYMMDD-XXXX
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const orderNumber = `ORD-${dateStr}-${randomUUID().slice(0, 8).toUpperCase()}`

  // Payment deadline: 30 minutes from now
  const paymentDeadline = new Date(now.getTime() + 30 * 60 * 1000)

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      total_amount: totalAmount,
      item_count: itemCount,
      status: 'pending_payment',
      payment_deadline: paymentDeadline.toISOString(),
    })
    .select()
    .single()

  if (orderError || !order) {
    throw createError({ statusCode: 500, message: 'ไม่สามารถสร้างคำสั่งซื้อได้' })
  }

  // Create order items
  const orderItems = cartItems.map((item: any) => ({
    order_id: order.id,
    ticket_id: item.ticket_id,
    price: item.tickets?.price || 0,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError) {
    // Rollback order
    await supabase.from('orders').delete().eq('id', order.id)
    throw createError({ statusCode: 500, message: 'ไม่สามารถสร้างรายการคำสั่งซื้อได้' })
  }

  // Convert cart items status
  const cartItemIds = cartItems.map((item: any) => item.id)
  await supabase
    .from('cart_items')
    .update({ status: 'converted' })
    .in('id', cartItemIds)

  // Get platform bank account for payment instructions
  const { data: bankSetting } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'platform_bank_account')
    .single()

  return {
    status: 'success',
    data: {
      order_id: order.id,
      order_number: order.order_number,
      total_amount: totalAmount,
      item_count: itemCount,
      payment_deadline: paymentDeadline.toISOString(),
      bank_account: bankSetting?.value || null,
    },
  }
})
