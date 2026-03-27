import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../../../utils/supabase'

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

  // Import the prize checker service
  const { fetchLatestResults } = await import('../../../../services/prizeChecker.service')

  // Fetch results from external API
  const results = await fetchLatestResults(drawId)

  if (!results || results.length === 0) {
    throw createError({ statusCode: 404, message: 'ไม่พบผลรางวัลสำหรับงวดนี้' })
  }

  // Save results to draw_results table
  const drawResults = results.map((r: any) => ({
    draw_id: drawId,
    prize_type: r.prize_type,
    prize_name: r.prize_name,
    winning_number: r.winning_number,
    prize_amount: r.prize_amount,
  }))

  // Delete existing results for this draw first
  await supabase.from('draw_results').delete().eq('draw_id', drawId)

  const { error: insertError } = await supabase
    .from('draw_results')
    .insert(drawResults)

  if (insertError) {
    throw createError({ statusCode: 500, message: `บันทึกผลรางวัลล้มเหลว: ${insertError.message}` })
  }

  // Update draw status to resulted
  await supabase
    .from('lottery_draws')
    .update({ status: 'resulted' })
    .eq('id', drawId)

  return {
    status: 'success',
    data: {
      draw_id: drawId,
      results_count: drawResults.length,
      message: 'ดึงผลรางวัลเรียบร้อยแล้ว',
    },
  }
})
