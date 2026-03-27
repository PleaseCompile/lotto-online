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

  const query = getQuery(event)
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20))
  const offset = (page - 1) * limit
  const search = (query.search as string) || ''
  const status = query.status as string
  const drawId = query.draw_id as string
  const sort = (query.sort as string) || 'created_at_desc'

  let q = supabase
    .from('tickets')
    .select('*, lottery_draws(draw_date, status)', { count: 'exact' })

  if (search) {
    q = q.like('number', `%${search}%`)
  }
  if (status) {
    q = q.eq('status', status)
  }
  if (drawId) {
    q = q.eq('draw_id', drawId)
  }

  // Sorting
  const [sortField, sortDir] = sort.includes('_desc')
    ? [sort.replace('_desc', ''), true]
    : [sort.replace('_asc', ''), false]

  const fieldMap: Record<string, string> = {
    created_at: 'created_at',
    price: 'price',
    number: 'number',
    status: 'status',
  }

  q = q.order(fieldMap[sortField] || 'created_at', { ascending: !sortDir })
  q = q.range(offset, offset + limit - 1)

  const { data: tickets, count, error } = await q

  if (error) {
    throw createError({ statusCode: 500, message: 'ดึงข้อมูลไม่สำเร็จ' })
  }

  return {
    data: tickets || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  }
})
