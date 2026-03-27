import { getServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const supabase = getServiceClient()
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 24, 100)
  const from = (page - 1) * limit

  let dbQuery = supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .eq('status', 'available')

  // Filters
  if (query.number) {
    dbQuery = dbQuery.eq('ticket_number', query.number as string)
  }
  if (query.suffix2) {
    dbQuery = dbQuery.like('ticket_number', `%${query.suffix2}`)
  }
  if (query.suffix3) {
    dbQuery = dbQuery.like('ticket_number', `%${query.suffix3}`)
  }
  if (query.prefix3) {
    dbQuery = dbQuery.like('ticket_number', `${query.prefix3}%`)
  }
  if (query.draw_id) {
    dbQuery = dbQuery.eq('draw_id', query.draw_id as string)
  }
  if (query.min_price) {
    dbQuery = dbQuery.gte('price', parseInt(query.min_price as string))
  }
  if (query.max_price) {
    dbQuery = dbQuery.lte('price', parseInt(query.max_price as string))
  }

  // Sort
  const sort = (query.sort as string) || 'price_asc'
  if (sort === 'price_desc') {
    dbQuery = dbQuery.order('price', { ascending: false })
  } else if (sort === 'number_asc') {
    dbQuery = dbQuery.order('ticket_number', { ascending: true })
  } else if (sort === 'number_desc') {
    dbQuery = dbQuery.order('ticket_number', { ascending: false })
  } else {
    dbQuery = dbQuery.order('price', { ascending: true })
  }

  dbQuery = dbQuery.range(from, from + limit - 1)

  const { data, count, error } = await dbQuery

  if (error) {
    throw createError({ statusCode: 500, message: 'ไม่สามารถค้นหาลอตเตอรี่ได้' })
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
