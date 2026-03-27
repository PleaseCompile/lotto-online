import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../../utils/supabase'
import { parseLotteryBarcode } from '../../../utils/barcode'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const supabase = getServiceClient()

  // Check admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'เฉพาะแอดมินเท่านั้น' })
  }

  const body = await readBody(event)
  const { barcode_raw, draw_id, price } = body

  if (!barcode_raw || !draw_id) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุ barcode_raw และ draw_id' })
  }

  if (!price || price < 0) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุราคาที่ถูกต้อง' })
  }

  // Parse barcode
  const parsed = parseLotteryBarcode(barcode_raw)
  if (!parsed) {
    throw createError({ statusCode: 400, message: 'ไม่สามารถอ่าน barcode ได้ กรุณาลองสแกนใหม่' })
  }

  // Validate ticket number is 6 digits
  if (!/^\d{6}$/.test(parsed.ticketNumber)) {
    throw createError({ statusCode: 400, message: 'เลขลอตเตอรี่ต้องเป็น 6 หลัก' })
  }

  // Check draw exists and is valid
  const { data: draw } = await supabase
    .from('lottery_draws')
    .select('id, status')
    .eq('id', draw_id)
    .single()

  if (!draw) {
    throw createError({ statusCode: 404, message: 'ไม่พบงวดนี้' })
  }

  // Check for duplicate ticket in the same draw
  const { data: existing } = await supabase
    .from('tickets')
    .select('id')
    .eq('number', parsed.ticketNumber)
    .eq('draw_id', draw_id)
    .eq('set_number', parsed.setNumber || '1')
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, message: `ลอตเตอรี่เลข ${parsed.ticketNumber} ชุดที่ ${parsed.setNumber || '1'} มีในระบบแล้ว` })
  }

  // Insert ticket
  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      number: parsed.ticketNumber,
      set_number: parsed.setNumber || '1',
      draw_id,
      seller_id: user.id,
      price,
      status: 'available',
      barcode_raw,
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: 'ไม่สามารถบันทึกลอตเตอรี่ได้' })
  }

  return {
    status: 'success',
    data: ticket,
  }
})
