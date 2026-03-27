import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const supabase = getServiceClient()

  const { data: cartItems } = await supabase
    .from('cart_items')
    .select('*, tickets(id, ticket_number, price, set_number)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const items = (cartItems || []).map((item: any) => {
    const now = Date.now()
    const expires = new Date(item.expires_at).getTime()
    const countdownSeconds = Math.max(0, Math.floor((expires - now) / 1000))

    return {
      id: item.id,
      ticket_id: item.ticket_id,
      ticket_number: item.tickets?.ticket_number,
      price: item.tickets?.price,
      set_number: item.tickets?.set_number,
      locked_at: item.locked_at,
      expires_at: item.expires_at,
      countdown_seconds: countdownSeconds,
    }
  })

  return {
    status: 'success',
    data: items,
  }
})
