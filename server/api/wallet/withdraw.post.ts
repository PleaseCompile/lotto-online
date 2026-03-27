import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const body = await readBody(event)
  const { amount, bank_account_id } = body || {}

  if (!amount || amount <= 0) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุจำนวนเงินที่ต้องการถอน' })
  }

  if (!bank_account_id) {
    throw createError({ statusCode: 400, message: 'กรุณาเลือกบัญชีธนาคาร' })
  }

  const amountSatang = Math.round(amount * 100)

  const supabase = getServiceClient()

  // Verify bank account belongs to user
  const { data: bankAccount } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('id', bank_account_id)
    .eq('user_id', user.id)
    .single()

  if (!bankAccount) {
    throw createError({ statusCode: 404, message: 'ไม่พบบัญชีธนาคาร' })
  }

  // Get wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!wallet) {
    throw createError({ statusCode: 404, message: 'ไม่พบกระเป๋าเงิน' })
  }

  if (wallet.balance < amountSatang) {
    throw createError({ statusCode: 400, message: 'ยอดเงินไม่เพียงพอ' })
  }

  // Deduct balance
  const { error: updateError } = await supabase
    .from('wallets')
    .update({ balance: wallet.balance - amountSatang })
    .eq('id', wallet.id)
    .eq('balance', wallet.balance) // optimistic lock

  if (updateError) {
    throw createError({ statusCode: 409, message: 'ยอดเงินมีการเปลี่ยนแปลง กรุณาลองใหม่' })
  }

  // Create withdrawal transaction
  const { data: tx, error: txError } = await supabase
    .from('wallet_transactions')
    .insert({
      wallet_id: wallet.id,
      type: 'withdrawal',
      amount: amountSatang,
      description: `ถอนเงินไปบัญชี ${bankAccount.bank_name} ${bankAccount.account_number}`,
      reference_type: 'bank_account',
      reference_id: bank_account_id,
    })
    .select()
    .single()

  if (txError) {
    // Rollback balance
    await supabase
      .from('wallets')
      .update({ balance: wallet.balance })
      .eq('id', wallet.id)

    throw createError({ statusCode: 500, message: 'ไม่สามารถสร้างรายการถอนเงินได้' })
  }

  // Create notification
  await supabase.from('notifications').insert({
    user_id: user.id,
    type: 'system',
    title: 'คำขอถอนเงิน',
    message: `คำขอถอนเงิน ฿${(amountSatang / 100).toLocaleString()} ไปบัญชี ${bankAccount.bank_name} รอดำเนินการ`,
  })

  return {
    status: 'success',
    data: {
      transaction_id: tx.id,
      amount: amountSatang,
      new_balance: wallet.balance - amountSatang,
      message: 'คำขอถอนเงินถูกส่งแล้ว รอแอดมินดำเนินการ',
    },
  }
})
