import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../../../utils/supabase'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

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

  const drawId = getRouterParam(event, 'id')
  if (!drawId) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุ draw ID' })
  }

  // Verify draw exists and has results
  const { data: draw } = await supabase
    .from('lottery_draws')
    .select('*')
    .eq('id', drawId)
    .single()

  if (!draw) {
    throw createError({ statusCode: 404, message: 'ไม่พบงวด' })
  }

  if (draw.status !== 'resulted') {
    throw createError({ statusCode: 400, message: 'กรุณาดึงผลรางวัลก่อน (สถานะต้องเป็น resulted)' })
  }

  // Check if results exist
  const { count } = await supabase
    .from('draw_results')
    .select('*', { count: 'exact', head: true })
    .eq('draw_id', drawId)

  if (!count || count === 0) {
    throw createError({ statusCode: 400, message: 'ไม่พบผลรางวัลในระบบ กรุณาดึงผลรางวัลก่อน' })
  }

  // Queue the prize check job
  const config = useRuntimeConfig()
  const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null })

  try {
    const queue = new Queue('prize-checker', { connection })
    await queue.add('check-prizes', { drawId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      jobId: `prize-check-${drawId}`,
    })
    await queue.close()
  } finally {
    connection.disconnect()
  }

  return {
    status: 'success',
    data: {
      draw_id: drawId,
      message: 'เริ่มตรวจรางวัลแล้ว ระบบจะแจ้งเตือนผู้ถูกรางวัลอัตโนมัติ',
    },
  }
})
