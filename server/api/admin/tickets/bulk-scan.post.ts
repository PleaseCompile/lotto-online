import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../../utils/supabase'
import { parseLotteryBarcode } from '../../../utils/barcode'

interface BulkScanItem {
  barcode_raw: string
  price: number
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const supabase = getServiceClient()

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'เฉพาะแอดมินเท่านั้น' })
  }

  const body = await readBody(event)
  const { items, draw_id }: { items: BulkScanItem[]; draw_id: string } = body

  if (!items?.length || !draw_id) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุ items และ draw_id' })
  }

  if (items.length > 100) {
    throw createError({ statusCode: 400, message: 'นำเข้าได้สูงสุด 100 ใบต่อครั้ง' })
  }

  // Check draw exists
  const { data: draw } = await supabase
    .from('lottery_draws')
    .select('id, status')
    .eq('id', draw_id)
    .single()

  if (!draw) {
    throw createError({ statusCode: 404, message: 'ไม่พบงวดนี้' })
  }

  const results: Array<{ barcode_raw: string; success: boolean; ticket?: any; error?: string }> = []

  for (const item of items) {
    try {
      const parsed = parseLotteryBarcode(item.barcode_raw)
      if (!parsed || !/^\d{6}$/.test(parsed.ticketNumber)) {
        results.push({ barcode_raw: item.barcode_raw, success: false, error: 'ไม่สามารถอ่าน barcode ได้' })
        continue
      }

      // Check duplicate
      const { data: existing } = await supabase
        .from('tickets')
        .select('id')
        .eq('number', parsed.ticketNumber)
        .eq('draw_id', draw_id)
        .eq('set_number', parsed.setNumber || '1')
        .maybeSingle()

      if (existing) {
        results.push({ barcode_raw: item.barcode_raw, success: false, error: `เลข ${parsed.ticketNumber} มีในระบบแล้ว` })
        continue
      }

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          number: parsed.ticketNumber,
          set_number: parsed.setNumber || '1',
          draw_id,
          seller_id: user.id,
          price: item.price,
          status: 'available',
          barcode_raw: item.barcode_raw,
        })
        .select()
        .single()

      if (error) {
        results.push({ barcode_raw: item.barcode_raw, success: false, error: 'บันทึกไม่สำเร็จ' })
      } else {
        results.push({ barcode_raw: item.barcode_raw, success: true, ticket })
      }
    } catch {
      results.push({ barcode_raw: item.barcode_raw, success: false, error: 'เกิดข้อผิดพลาด' })
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  return {
    status: 'success',
    data: {
      total: items.length,
      success_count: successCount,
      fail_count: failCount,
      results,
    },
  }
})
