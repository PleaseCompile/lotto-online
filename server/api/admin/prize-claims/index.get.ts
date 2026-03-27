import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const supabase = getServiceClient()

  // Verify admin
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'ไม่มีสิทธิ์เข้าถึง' })
  }

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Math.min(Number(query.limit) || 20, 50)
  const offset = (page - 1) * limit
  const status = query.status as string | undefined
  const drawId = query.draw_id as string | undefined

  let q = supabase
    .from('prize_claims')
    .select(`
      *,
      users!inner(full_name, phone),
      tickets!inner(ticket_number),
      lottery_draws!inner(draw_date)
    `, { count: 'exact' })

  if (status) {
    q = q.eq('status', status)
  }

  if (drawId) {
    q = q.eq('draw_id', drawId)
  }

  const { data, count, error } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    status: 'success',
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  }
})
