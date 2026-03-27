import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุ prize claim ID' })
  }

  const supabase = getServiceClient()

  // Verify claim belongs to user
  const { data: claim } = await supabase
    .from('prize_claims')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!claim) {
    throw createError({ statusCode: 404, message: 'ไม่พบรายการรางวัล' })
  }

  if (claim.status !== 'pending') {
    throw createError({ statusCode: 400, message: `รายการนี้สถานะ ${claim.status} แล้ว` })
  }

  // Update claim status to claimed
  await supabase
    .from('prize_claims')
    .update({ status: 'claimed' })
    .eq('id', id)

  return {
    status: 'success',
    data: {
      claim_id: id,
      net_amount: claim.net_amount,
      message: 'ขอขึ้นเงินรางวัลเรียบร้อย รอแอดมินดำเนินการ',
    },
  }
})
