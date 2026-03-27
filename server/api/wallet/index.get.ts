import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const supabase = getServiceClient()

  // Get or create wallet
  let { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!wallet) {
    const { data: newWallet, error } = await supabase
      .from('wallets')
      .insert({ user_id: user.id, balance: 0 })
      .select()
      .single()

    if (error) {
      throw createError({ statusCode: 500, message: 'ไม่สามารถสร้างกระเป๋าเงินได้' })
    }
    wallet = newWallet
  }

  // Get recent transactions
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Math.min(Number(query.limit) || 20, 50)
  const offset = (page - 1) * limit

  const { data: transactions, count } = await supabase
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return {
    status: 'success',
    data: {
      balance: wallet.balance,
      wallet_id: wallet.id,
      transactions: transactions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    },
  }
})
