import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../../utils/supabase'
import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

let slipQueue: Queue | null = null

function getSlipQueue(): Queue {
  if (!slipQueue) {
    const config = useRuntimeConfig()
    const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null })
    slipQueue = new Queue('slip-verification', { connection })
  }
  return slipQueue
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const orderId = getRouterParam(event, 'orderId')
  if (!orderId) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุ order ID' })
  }

  const supabase = getServiceClient()

  // Verify order belongs to user and is pending payment
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, total_amount, user_id')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single()

  if (!order) {
    throw createError({ statusCode: 404, message: 'ไม่พบออเดอร์' })
  }

  if (order.status !== 'pending_payment') {
    throw createError({ statusCode: 400, message: 'ออเดอร์นี้ไม่อยู่ในสถานะรอชำระเงิน' })
  }

  // Read the multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'กรุณาอัปโหลดรูปสลิป' })
  }

  const slipFile = formData.find((f) => f.name === 'slip')
  if (!slipFile || !slipFile.data) {
    throw createError({ statusCode: 400, message: 'ไม่พบไฟล์สลิป' })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (slipFile.type && !allowedTypes.includes(slipFile.type)) {
    throw createError({ statusCode: 400, message: 'รองรับเฉพาะไฟล์ JPEG, PNG, WebP' })
  }

  // Validate file size (max 5MB)
  if (slipFile.data.length > 5 * 1024 * 1024) {
    throw createError({ statusCode: 400, message: 'ไฟล์ใหญ่เกิน 5MB' })
  }

  // Upload to Supabase Storage
  const fileName = `slips/${orderId}/${Date.now()}.${slipFile.type?.split('/')[1] || 'jpg'}`

  const { error: uploadError } = await supabase.storage
    .from('payments')
    .upload(fileName, slipFile.data, {
      contentType: slipFile.type || 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    throw createError({ statusCode: 500, message: 'อัปโหลดสลิปไม่สำเร็จ' })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('payments')
    .getPublicUrl(fileName)

  const slipUrl = urlData.publicUrl

  // Create payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      method: 'bank_transfer',
      amount: order.total_amount,
      slip_image_url: slipUrl,
      status: 'pending_verification',
    })
    .select()
    .single()

  if (paymentError) {
    throw createError({ statusCode: 500, message: 'บันทึกข้อมูลชำระเงินไม่สำเร็จ' })
  }

  // Queue slip verification job
  try {
    const queue = getSlipQueue()
    await queue.add('verify-slip', {
      paymentId: payment.id,
      orderId,
      slipImageUrl: slipUrl,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 100,
    })
  } catch {
    // Queue might not be available, admin can verify manually
    console.warn('Failed to queue slip verification, manual verification required')
  }

  return {
    status: 'success',
    data: {
      payment_id: payment.id,
      slip_url: slipUrl,
      message: 'อัปโหลดสลิปเรียบร้อย กำลังตรวจสอบ...',
    },
  }
})
