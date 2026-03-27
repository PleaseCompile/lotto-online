import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุ ID' })
  }

  const supabase = getServiceClient()

  // Verify ownership
  const { data: account } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!account) {
    throw createError({ statusCode: 404, message: 'ไม่พบบัญชีธนาคาร' })
  }

  const { error } = await supabase
    .from('bank_accounts')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // If deleted was default, make another default
  if (account.is_default) {
    const { data: remaining } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    if (remaining && remaining.length > 0) {
      await supabase
        .from('bank_accounts')
        .update({ is_default: true })
        .eq('id', remaining[0].id)
    }
  }

  return {
    status: 'success',
    message: 'ลบบัญชีธนาคารเรียบร้อย',
  }
})
