import { getServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const supabase = getServiceClient()

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('*, lottery_draws(*)')
    .eq('id', id)
    .single()

  if (error || !ticket) {
    throw createError({ statusCode: 404, message: 'ไม่พบลอตเตอรี่ใบนี้' })
  }

  return {
    status: 'success',
    data: ticket,
  }
})
