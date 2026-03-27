import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../utils/supabase'

const VALID_BANKS = [
  'กสิกรไทย', 'กรุงเทพ', 'กรุงไทย', 'ไทยพาณิชย์', 'ทหารไทยธนชาต',
  'กรุงศรีอยุธยา', 'ออมสิน', 'ธ.ก.ส.', 'เกียรตินาคินภัทร', 'ซีไอเอ็มบี',
  'ทิสโก้', 'ยูโอบี', 'แลนด์ แอนด์ เฮ้าส์', 'สแตนดาร์ดชาร์เตอร์ด',
]

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const body = await readBody(event)
  const { bank_name, account_number, account_name, is_default } = body || {}

  if (!bank_name || !account_number || !account_name) {
    throw createError({ statusCode: 400, message: 'กรุณากรอกข้อมูลให้ครบ' })
  }

  if (!VALID_BANKS.includes(bank_name)) {
    throw createError({ statusCode: 400, message: 'ธนาคารไม่ถูกต้อง' })
  }

  // Validate account number (10-15 digits)
  const cleanNumber = account_number.replace(/\D/g, '')
  if (cleanNumber.length < 10 || cleanNumber.length > 15) {
    throw createError({ statusCode: 400, message: 'เลขบัญชีต้องเป็นตัวเลข 10-15 หลัก' })
  }

  const supabase = getServiceClient()

  // Check max 3 bank accounts
  const { count } = await supabase
    .from('bank_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count || 0) >= 3) {
    throw createError({ statusCode: 400, message: 'เพิ่มบัญชีธนาคารได้สูงสุด 3 บัญชี' })
  }

  // If is_default, unset other defaults
  if (is_default) {
    await supabase
      .from('bank_accounts')
      .update({ is_default: false })
      .eq('user_id', user.id)
  }

  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      user_id: user.id,
      bank_name,
      account_number: cleanNumber,
      account_name,
      is_default: is_default || (count === 0), // first account is default
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    status: 'success',
    data,
  }
})
