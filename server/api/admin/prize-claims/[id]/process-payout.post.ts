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

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุ prize claim ID' })
  }

  // Get the claim
  const { data: claim } = await supabase
    .from('prize_claims')
    .select('*')
    .eq('id', id)
    .single()

  if (!claim) {
    throw createError({ statusCode: 404, message: 'ไม่พบรายการรางวัล' })
  }

  if (claim.status !== 'claimed') {
    throw createError({ statusCode: 400, message: `ไม่สามารถจ่ายรางวัลได้ สถานะปัจจุบัน: ${claim.status}` })
  }

  // Get or create wallet for user
  let { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', claim.user_id)
    .single()

  if (!wallet) {
    const { data: newWallet } = await supabase
      .from('wallets')
      .insert({ user_id: claim.user_id, balance: 0 })
      .select()
      .single()
    wallet = newWallet
  }

  if (!wallet) {
    throw createError({ statusCode: 500, message: 'ไม่สามารถสร้างกระเป๋าเงินได้' })
  }

  // Credit wallet with net amount (prize - platform fee)
  const newBalance = wallet.balance + claim.net_amount

  const { error: walletError } = await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('id', wallet.id)

  if (walletError) {
    throw createError({ statusCode: 500, message: 'อัปเดตยอดเงินล้มเหลว' })
  }

  // Create wallet transaction
  await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    type: 'prize',
    amount: claim.net_amount,
    description: `เงินรางวัล ${claim.prize_type} (หลังหักค่าธรรมเนียม)`,
    reference_type: 'prize_claim',
    reference_id: id,
  })

  // Update claim status to paid
  await supabase
    .from('prize_claims')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by: user.id,
    })
    .eq('id', id)

  // Notify user
  await supabase.from('notifications').insert({
    user_id: claim.user_id,
    type: 'prize',
    title: 'เงินรางวัลเข้ากระเป๋าแล้ว',
    message: `เงินรางวัล ฿${(claim.net_amount / 100).toLocaleString()} ได้เข้ากระเป๋าเงินของคุณแล้ว`,
    link: '/wallet',
  })

  return {
    status: 'success',
    data: {
      claim_id: id,
      amount_credited: claim.net_amount,
      new_balance: newBalance,
      message: 'จ่ายเงินรางวัลเรียบร้อย',
    },
  }
})
